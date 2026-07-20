using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Knome.API.Constants;
using Knome.API.Data;
using Knome.API.DTOs.Communities;
using Knome.API.Exceptions;
using Knome.API.Interfaces;
using Knome.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Knome.API.Services;

public class CommunityService : ICommunityService
{
    private readonly ICommunityRepository _repo;
    private readonly IContentInteractionService _interactionService;
    private readonly KnomeDbContext _db;
    private readonly IMapper _mapper;
    private readonly ISuspensionGuard _suspensionGuard;
    private readonly INotificationService _notificationService;
    private readonly IPostRepository _postRepo;

    public CommunityService(
        ICommunityRepository repo,
        IContentInteractionService interactionService,
        KnomeDbContext db,
        IMapper mapper,
        ISuspensionGuard suspensionGuard,
        INotificationService notificationService,
        IPostRepository postRepo)
    {
        _repo = repo;
        _interactionService = interactionService;
        _db = db;
        _mapper = mapper;
        _suspensionGuard = suspensionGuard;
        _notificationService = notificationService;
        _postRepo = postRepo;
    }

    private async Task CheckIsAdminOrSysAdminAsync(int communityId, int currentUserId)
    {
        var exists = await _db.Communities.AnyAsync(c => c.CommunityId == communityId);
        if (!exists)
            throw new NotFoundException($"Community ID {communityId} not found.");

        var isAdmin = await _repo.IsCommunityAdminAsync(communityId, currentUserId);
        if (!isAdmin)
        {
            // Also check if user is a System Administrator
            var user = await _db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.UserId == currentUserId);
            if (user == null || !user.Roles.Any(r => r.RoleName == Roles.SystemAdmin))
            {
                throw new UnauthorizedException("You must be a Community Admin or System Administrator to perform this action.");
            }
        }
    }

    private async Task CheckCanViewCommunityAsync(int communityId, int currentUserId, Community? community = null)
    {
        if (community == null)
            community = await _repo.GetCommunityByIdAsync(communityId);

        if (community == null)
            throw new NotFoundException($"Community ID {communityId} not found.");

        if (community.CommunityType == CommunityTypes.Private)
        {
            var isAdmin = await _repo.IsCommunityAdminAsync(communityId, currentUserId);
            if (!isAdmin)
            {
                var member = await _repo.GetMemberAsync(communityId, currentUserId);
                if (member == null || member.Status != CommunityMemberStatuses.Approved)
                {
                    // Check if System Administrator
                    var user = await _db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.UserId == currentUserId);
                    if (user == null || !user.Roles.Any(r => r.RoleName == Roles.SystemAdmin))
                    {
                        throw new UnauthorizedException("You must be an approved member to view or interact with this private community.");
                    }
                }
            }
        }
    }

    // --- Discovery & Details ---
    public async Task<CommunityDto> GetCommunityAsync(int communityId, int currentUserId)
    {
        var community = await _repo.GetCommunityByIdAsync(communityId);
        if (community == null)
            throw new NotFoundException($"Community ID {communityId} not found.");

        await CheckCanViewCommunityAsync(communityId, currentUserId, community);

        var dto = _mapper.Map<CommunityDto>(community);
        dto.IsCurrentUserAdmin = await _repo.IsCommunityAdminAsync(communityId, currentUserId);
        
        var member = await _repo.GetMemberAsync(communityId, currentUserId);
        dto.CurrentUserMembershipStatus = member?.Status;

        return dto;
    }

    public async Task<List<CommunityDto>> GetCommunitiesAsync(int? categoryId, string? type, string? search, int pageNumber, int pageSize, int currentUserId)
    {
        var communities = await _repo.GetCommunitiesAsync(categoryId, type, search, pageNumber, pageSize);
        var dtos = new List<CommunityDto>();

        foreach (var c in communities)
        {
            var dto = _mapper.Map<CommunityDto>(c);
            dto.IsCurrentUserAdmin = await _repo.IsCommunityAdminAsync(c.CommunityId, currentUserId);
            var member = await _repo.GetMemberAsync(c.CommunityId, currentUserId);
            dto.CurrentUserMembershipStatus = member?.Status;
            dtos.Add(dto);
        }

        return dtos;
    }

    public async Task<List<CommunityDto>> GetMyCommunitiesAsync(int currentUserId)
    {
        var communities = await _repo.GetUserCommunitiesAsync(currentUserId);
        var dtos = new List<CommunityDto>();

        foreach (var c in communities)
        {
            var dto = _mapper.Map<CommunityDto>(c);
            dto.IsCurrentUserAdmin = await _repo.IsCommunityAdminAsync(c.CommunityId, currentUserId);
            var member = await _repo.GetMemberAsync(c.CommunityId, currentUserId);
            dto.CurrentUserMembershipStatus = member?.Status ?? (dto.IsCurrentUserAdmin ? CommunityMemberStatuses.Approved : null);
            dtos.Add(dto);
        }

        return dtos;
    }

    // --- Create & Update ---
    public async Task<CommunityDto> CreateCommunityAsync(int currentUserId, CreateCommunityDto dto)
    {
        await _suspensionGuard.EnsureNotSuspendedAsync(currentUserId);

        // Security Screening (FR-SM-01)
        var secCheck = await _interactionService.ValidateContentSecurityAsync($"{dto.Name} {dto.Description} {dto.Rules} {dto.Faq}", dto.BannerUrl ?? dto.ThumbnailUrl);
        if (!secCheck.IsValid)
            throw new BadRequestException("Community details contain blocked URLs or restricted keywords.");

        // FK existence validation (GBV-001)
        if (dto.CategoryId.HasValue)
        {
            var categoryExists = await _db.Categories.AnyAsync(c => c.CategoryId == dto.CategoryId.Value);
            if (!categoryExists)
                throw new BadRequestException($"Category ID {dto.CategoryId.Value} does not exist.");
        }

        var community = new Community
        {
            Name = dto.Name,
            Description = dto.Description,
            BannerUrl = dto.BannerUrl,
            ThumbnailUrl = dto.ThumbnailUrl,
            CategoryId = dto.CategoryId,
            Rules = dto.Rules,
            Faq = dto.Faq,
            CommunityType = dto.CommunityType,
            CreatedByUserId = currentUserId,
            CreatedDate = DateTime.UtcNow
        };

        await _repo.AddCommunityAsync(community);

        // Add creator to CommunityAdmins and as an Approved Moderator member
        await _repo.AddCommunityAdminAsync(community.CommunityId, currentUserId);

        var member = new CommunityMember
        {
            CommunityId = community.CommunityId,
            UserId = currentUserId,
            MemberType = CommunityMemberTypes.Moderator,
            Status = CommunityMemberStatuses.Approved,
            RequestedDate = DateTime.UtcNow,
            DecidedDate = DateTime.UtcNow
        };
        await _repo.AddMemberAsync(member);

        return await GetCommunityAsync(community.CommunityId, currentUserId);
    }

    public async Task<CommunityDto> UpdateCommunityAsync(int communityId, int currentUserId, UpdateCommunityDto dto)
    {
        var community = await _repo.GetCommunityByIdAsync(communityId);
        if (community == null)
            throw new NotFoundException($"Community ID {communityId} not found.");

        await CheckIsAdminOrSysAdminAsync(communityId, currentUserId);

        var secCheck = await _interactionService.ValidateContentSecurityAsync($"{dto.Name} {dto.Description} {dto.Rules} {dto.Faq}", dto.BannerUrl ?? dto.ThumbnailUrl);
        if (!secCheck.IsValid)
            throw new BadRequestException("Updated community details contain blocked URLs or restricted keywords.");

        // FK existence validation (GBV-001)
        if (dto.CategoryId.HasValue)
        {
            var categoryExists = await _db.Categories.AnyAsync(c => c.CategoryId == dto.CategoryId.Value);
            if (!categoryExists)
                throw new BadRequestException($"Category ID {dto.CategoryId.Value} does not exist.");
        }

        community.Name = dto.Name;
        community.Description = dto.Description;
        community.BannerUrl = dto.BannerUrl;
        community.ThumbnailUrl = dto.ThumbnailUrl;
        if (dto.CategoryId.HasValue) community.CategoryId = dto.CategoryId.Value;
        community.Rules = dto.Rules;
        community.Faq = dto.Faq;

        await _repo.UpdateCommunityAsync(community);
        return await GetCommunityAsync(communityId, currentUserId);
    }

    public async Task DeleteCommunityAsync(int communityId, int currentUserId)
    {
        var community = await _repo.GetCommunityByIdAsync(communityId);
        if (community == null)
            throw new NotFoundException($"Community ID {communityId} not found.");

        await CheckIsAdminOrSysAdminAsync(communityId, currentUserId);

        await _repo.DeleteCommunityAsync(community);
    }

    // --- Membership & Joining ---
    public async Task<CommunityMemberDto> JoinCommunityAsync(int communityId, int currentUserId)
    {
        var community = await _repo.GetCommunityByIdAsync(communityId);
        if (community == null)
            throw new NotFoundException($"Community ID {communityId} not found.");

        var existingMember = await _repo.GetMemberAsync(communityId, currentUserId);
        if (existingMember != null)
        {
            if (existingMember.Status == CommunityMemberStatuses.Approved || existingMember.Status == CommunityMemberStatuses.Pending)
                return _mapper.Map<CommunityMemberDto>(existingMember);

            if (existingMember.Status == CommunityMemberStatuses.Banned)
                throw new BadRequestException("You have been banned from joining this community.");

            // Re-apply if previously rejected
            existingMember.Status = community.CommunityType == CommunityTypes.Public
                ? CommunityMemberStatuses.Approved
                : CommunityMemberStatuses.Pending;
            existingMember.RequestedDate = DateTime.UtcNow;
            existingMember.DecidedDate = community.CommunityType == CommunityTypes.Public ? DateTime.UtcNow : null;

            await _repo.UpdateMemberAsync(existingMember);
            return _mapper.Map<CommunityMemberDto>(existingMember);
        }

        var newMember = new CommunityMember
        {
            CommunityId = communityId,
            UserId = currentUserId,
            MemberType = CommunityMemberTypes.Subscriber,
            Status = community.CommunityType == CommunityTypes.Public
                ? CommunityMemberStatuses.Approved
                : CommunityMemberStatuses.Pending,
            RequestedDate = DateTime.UtcNow,
            DecidedDate = community.CommunityType == CommunityTypes.Public ? DateTime.UtcNow : null
        };

        await _repo.AddMemberAsync(newMember);

        if (newMember.Status == CommunityMemberStatuses.Pending)
        {
            var adminIds = await _db.Communities
                .Where(c => c.CommunityId == communityId)
                .SelectMany(c => c.Users)
                .Select(u => u.UserId)
                .ToListAsync();
            if (adminIds.Count > 0)
            {
                await _notificationService.PublishBroadcastAsync(
                    NotificationTypes.CommunityJoin,
                    $"A new join request is pending for {community.Name}.",
                    relatedContentType: NotificationContentTypes.Community,
                    relatedContentId: communityId,
                    candidateUserIds: adminIds);
            }
        }

        // Fetch back with User navigation resolved for DTO mapping
        var savedMember = await _repo.GetMemberAsync(communityId, currentUserId);
        return _mapper.Map<CommunityMemberDto>(savedMember);
    }

    public async Task LeaveCommunityAsync(int communityId, int currentUserId)
    {
        var community = await _repo.GetCommunityByIdAsync(communityId);
        if (community == null)
            throw new NotFoundException($"Community ID {communityId} not found.");

        if (community.CommunityType == CommunityTypes.Default)
            throw new BadRequestException("Employees cannot leave a Default system community (FR-CM-04).");

        var isAdmin = await _repo.IsCommunityAdminAsync(communityId, currentUserId);
        if (isAdmin)
        {
            var adminsCount = await _repo.GetCommunityAdminsCountAsync(communityId);
            if (adminsCount <= 1)
                throw new BadRequestException("Cannot leave community as you are the sole remaining Community Admin. Assign another admin first.");

            await _repo.RemoveCommunityAdminAsync(communityId, currentUserId);
        }

        var member = await _repo.GetMemberAsync(communityId, currentUserId);
        if (member != null)
        {
            await _repo.RemoveMemberAsync(member);
        }
    }

    public async Task<List<CommunityMemberDto>> GetMembersAsync(int communityId, string? status, int pageNumber, int pageSize, int currentUserId)
    {
        await CheckCanViewCommunityAsync(communityId, currentUserId);

        // If asking for pending/rejected/banned queues, verify admin
        if (status == CommunityMemberStatuses.Pending || status == CommunityMemberStatuses.Rejected || status == CommunityMemberStatuses.Banned)
        {
            await CheckIsAdminOrSysAdminAsync(communityId, currentUserId);
        }

        var members = await _repo.GetMembersAsync(communityId, status, pageNumber, pageSize);
        return _mapper.Map<List<CommunityMemberDto>>(members);
    }

    public async Task<CommunityMemberDto> DecideMembershipAsync(int communityId, int targetUserId, int currentUserId, DecideMembershipDto dto)
    {
        await CheckIsAdminOrSysAdminAsync(communityId, currentUserId);

        var member = await _repo.GetMemberAsync(communityId, targetUserId);
        if (member == null)
            throw new NotFoundException($"User ID {targetUserId} is not a member or applicant of this community.");

        member.Status = dto.Status;
        member.DecidedDate = DateTime.UtcNow;

        if (dto.Status == CommunityMemberStatuses.Banned || dto.Status == CommunityMemberStatuses.Rejected)
        {
            await _repo.RemoveCommunityAdminAsync(communityId, targetUserId);
            member.MemberType = CommunityMemberTypes.Subscriber;
        }

        await _repo.UpdateMemberAsync(member);

        if (dto.Status == CommunityMemberStatuses.Approved)
        {
            var community = await _repo.GetCommunityByIdAsync(communityId);
            await _notificationService.PublishAsync(
                targetUserId,
                NotificationTypes.CommunityJoin,
                $"Your request to join {(community?.Name ?? "the community")} has been approved.",
                relatedContentType: NotificationContentTypes.Community,
                relatedContentId: communityId);
        }

        return _mapper.Map<CommunityMemberDto>(member);
    }

    // --- Admin Delegation ---
    public async Task AddAdminAsync(int communityId, int targetUserId, int currentUserId)
    {
        await CheckIsAdminOrSysAdminAsync(communityId, currentUserId);

        var member = await _repo.GetMemberAsync(communityId, targetUserId);
        if (member == null || member.Status != CommunityMemberStatuses.Approved)
            throw new BadRequestException("Target user must be an approved member of the community before becoming an admin.");

        await _repo.AddCommunityAdminAsync(communityId, targetUserId);

        member.MemberType = CommunityMemberTypes.Moderator;
        await _repo.UpdateMemberAsync(member);

        var community = await _repo.GetCommunityByIdAsync(communityId);
        await _notificationService.PublishAsync(
            targetUserId,
            NotificationTypes.CommunityInvite,
            $"You have been promoted to Community Admin for {(community?.Name ?? "the community")}.",
            relatedContentType: NotificationContentTypes.Community,
            relatedContentId: communityId);
    }

    public async Task RemoveAdminAsync(int communityId, int targetUserId, int currentUserId)
    {
        await CheckIsAdminOrSysAdminAsync(communityId, currentUserId);

        var adminsCount = await _repo.GetCommunityAdminsCountAsync(communityId);
        if (adminsCount <= 1 && await _repo.IsCommunityAdminAsync(communityId, targetUserId))
            throw new BadRequestException("Cannot remove the sole remaining Community Admin.");

        await _repo.RemoveCommunityAdminAsync(communityId, targetUserId);

        var member = await _repo.GetMemberAsync(communityId, targetUserId);
        if (member != null)
        {
            member.MemberType = CommunityMemberTypes.Subscriber;
            await _repo.UpdateMemberAsync(member);
        }
    }

    // --- Posts & Feed ---
    public async Task<List<CommunityPostItemDto>> GetCommunityPostsAsync(int communityId, int pageNumber, int pageSize, int currentUserId)
    {
        await CheckCanViewCommunityAsync(communityId, currentUserId);

        var communityPosts = await _repo.GetCommunityPostsAsync(communityId, pageNumber, pageSize);
        var dtos = new List<CommunityPostItemDto>();

        foreach (var cp in communityPosts)
        {
            var author = cp.Post.AuthorUser;
            var summary = await _interactionService.GetContentSummaryAsync(ContentTypes.Post, cp.PostId, currentUserId);

            var attachments = await _db.PostAttachments
                .Where(pa => pa.PostId == cp.PostId)
                .Select(pa => pa.FileUrl)
                .ToListAsync();

            dtos.Add(new CommunityPostItemDto
            {
                CommunityId = cp.CommunityId,
                PostId = cp.PostId,
                AuthorUserId = cp.Post.AuthorUserId,
                AuthorEmployeeId = author?.EmployeeId ?? string.Empty,
                AuthorFullName = author?.FullName ?? "Unknown",
                AuthorDesignation = author?.Designation,
                AuthorProfilePhotoUrl = author?.ProfilePhotoUrl,
                ContentText = cp.Post.ContentText,
                AttachmentUrls = attachments,
                PublishedDate = cp.Post.PublishedDate ?? cp.Post.CreatedDate,
                IsPinned = cp.IsPinned,
                EngagementSummary = summary
            });
        }

        return dtos;
    }

    public async Task<CommunityPostItemDto> CreateCommunityPostAsync(int communityId, int currentUserId, CreateCommunityPostDto dto)
    {
        await _suspensionGuard.EnsureNotSuspendedAsync(currentUserId);
        await CheckCanViewCommunityAsync(communityId, currentUserId);

        // Security screening (FR-SM-01)
        var secCheck = await _interactionService.ValidateContentSecurityAsync(dto.ContentText, dto.AttachmentUrls.FirstOrDefault());
        if (!secCheck.IsValid)
            throw new BadRequestException("Post content or attachments contain blocked URLs or restricted keywords.");

        var post = new Post
        {
            AuthorUserId = currentUserId,
            ContentText = dto.ContentText,
            AudienceType = PostAudiences.Community,
            Status = PostStatuses.Published,
            PublishedDate = DateTime.UtcNow,
            CreatedDate = DateTime.UtcNow
        };

        post = await _postRepo.AddPostAsync(post, dto.AttachmentUrls, dto.AttachmentTypes, new List<int>());

        var communityPost = new CommunityPost
        {
            CommunityId = communityId,
            PostId = post.PostId,
            IsPinned = false
        };
        await _repo.AddCommunityPostAsync(communityPost);

        // FR-NT-01: notify community members of a new post (producer -> generic engine)
        var memberIds = await _db.CommunityMembers
            .Where(m => m.CommunityId == communityId && m.UserId != currentUserId)
            .Select(m => m.UserId)
            .ToListAsync();
        if (memberIds.Count > 0)
        {
            await _notificationService.PublishBroadcastAsync(
                NotificationTypes.Community,
                "A new post was shared in your community.",
                relatedContentType: ContentTypes.Post,
                relatedContentId: post.PostId,
                candidateUserIds: memberIds);
        }

        var author = await _db.Users.FindAsync(currentUserId);
        var summary = await _interactionService.GetContentSummaryAsync(ContentTypes.Post, post.PostId, currentUserId);

        return new CommunityPostItemDto
        {
            CommunityId = communityId,
            PostId = post.PostId,
            AuthorUserId = currentUserId,
            AuthorEmployeeId = author?.EmployeeId ?? string.Empty,
            AuthorFullName = author?.FullName ?? "Unknown",
            AuthorDesignation = author?.Designation,
            AuthorProfilePhotoUrl = author?.ProfilePhotoUrl,
            ContentText = post.ContentText,
            AttachmentUrls = dto.AttachmentUrls,
            PublishedDate = post.PublishedDate ?? DateTime.UtcNow,
            IsPinned = false,
            EngagementSummary = summary
        };
    }

    public async Task<CommunityPostItemDto> PinPostAsync(int communityId, long postId, int currentUserId, PinCommunityPostDto dto)
    {
        await CheckIsAdminOrSysAdminAsync(communityId, currentUserId);

        var communityPost = await _repo.GetCommunityPostAsync(communityId, postId);
        if (communityPost == null)
            throw new NotFoundException($"Post ID {postId} not found in Community ID {communityId}.");

        if (dto.IsPinned && !communityPost.IsPinned)
        {
            var pinnedCount = await _repo.GetPinnedPostsCountAsync(communityId);
            if (pinnedCount >= 3)
                throw new BadRequestException("A community can have a maximum of 3 pinned posts per business rules (FR-CM-06). Unpin another post first.");
        }

        communityPost.IsPinned = dto.IsPinned;
        await _repo.UpdateCommunityPostAsync(communityPost);

        var author = communityPost.Post.AuthorUser;
        var summary = await _interactionService.GetContentSummaryAsync(ContentTypes.Post, postId, currentUserId);

        var attachments = await _db.PostAttachments
            .Where(pa => pa.PostId == postId)
            .Select(pa => pa.FileUrl)
            .ToListAsync();

        return new CommunityPostItemDto
        {
            CommunityId = communityId,
            PostId = postId,
            AuthorUserId = communityPost.Post.AuthorUserId,
            AuthorEmployeeId = author?.EmployeeId ?? string.Empty,
            AuthorFullName = author?.FullName ?? "Unknown",
            AuthorDesignation = author?.Designation,
            AuthorProfilePhotoUrl = author?.ProfilePhotoUrl,
            ContentText = communityPost.Post.ContentText,
            AttachmentUrls = attachments,
            PublishedDate = communityPost.Post.PublishedDate ?? communityPost.Post.CreatedDate,
            IsPinned = communityPost.IsPinned,
            EngagementSummary = summary
        };
    }
}
