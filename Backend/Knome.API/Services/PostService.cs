using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Knome.API.Constants;
using Knome.API.Data;
using Knome.API.DTOs.Posts;
using Knome.API.Exceptions;
using Knome.API.Interfaces;
using Knome.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Knome.API.Services;

public class PostService : IPostService
{
    private readonly IPostRepository _repo;
    private readonly IContentInteractionService _interactionService;
    private readonly IKarmaService _karmaService;
    private readonly KnomeDbContext _db;
    private readonly IMapper _mapper;
    private readonly ISuspensionGuard _suspensionGuard;
    private readonly INotificationService _notificationService;

    public PostService(IPostRepository repo, IContentInteractionService interactionService, IKarmaService karmaService, KnomeDbContext db, IMapper mapper, ISuspensionGuard suspensionGuard, INotificationService notificationService)
    {
        _repo = repo;
        _interactionService = interactionService;
        _karmaService = karmaService;
        _db = db;
        _mapper = mapper;
        _suspensionGuard = suspensionGuard;
        _notificationService = notificationService;
    }

    private async Task CheckIsAuthorOrAdminAsync(Post post, int currentUserId)
    {
        if (post.AuthorUserId == currentUserId) return;

        var user = await _db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.UserId == currentUserId);
        if (user == null || !user.Roles.Any(r => 
            r.RoleName == Roles.SystemAdmin || r.RoleCode == "SYSADM" ||
            r.RoleName == Roles.HRAdmin || r.RoleCode == "HRADM" ||
            r.RoleName == Roles.CommunityAdmin || r.RoleCode == "CADM" ||
            (r.RoleName != null && r.RoleName.Contains("Admin")) ||
            (r.RoleCode != null && r.RoleCode.Contains("ADM"))))
        {
            throw new UnauthorizedException("You must be the author of this post or an Administrator to modify/delete it.");
        }
    }

    public async Task<PostDto> GetPostAsync(long postId, int currentUserId)
    {
        var post = await _repo.GetPostByIdAsync(postId);
        if (post == null)
            throw new NotFoundException($"Post ID {postId} not found.");

        var dto = _mapper.Map<PostDto>(post);
        dto.EngagementSummary = await _interactionService.GetContentSummaryAsync(ContentTypes.Post, postId, currentUserId);
        return dto;
    }

    public async Task<List<PostDto>> GetPostsAsync(string? audienceType, string? search, int pageNumber, int pageSize, int currentUserId)
    {
        var posts = await _repo.GetPostsAsync(audienceType, search, pageNumber, pageSize, currentUserId);
        var ids = posts.Select(p => p.PostId).ToList();
        var summaries = ids.Count > 0 
            ? await _interactionService.GetContentSummariesBatchAsync(ContentTypes.Post, ids, currentUserId)
            : new Dictionary<long, Knome.API.DTOs.Interactions.ContentSummaryDto>();

        var dtos = new List<PostDto>();
        foreach (var p in posts)
        {
            var dto = _mapper.Map<PostDto>(p);
            dto.EngagementSummary = summaries.TryGetValue(p.PostId, out var s) ? s : new Knome.API.DTOs.Interactions.ContentSummaryDto { ContentType = ContentTypes.Post, ContentId = p.PostId };
            dtos.Add(dto);
        }

        return dtos;
    }

    public async Task<List<PostDto>> GetMyPostsAsync(int currentUserId, int pageNumber = 1, int pageSize = 20)
    {
        return await GetUserPostsAsync(currentUserId, currentUserId, pageNumber, pageSize);
    }

    public async Task<List<PostDto>> GetUserPostsAsync(int authorUserId, int currentUserId, int pageNumber = 1, int pageSize = 20)
    {
        var posts = await _repo.GetMyPostsAsync(authorUserId, pageNumber, pageSize);
        var ids = posts.Select(p => p.PostId).ToList();
        var summaries = ids.Count > 0 
            ? await _interactionService.GetContentSummariesBatchAsync(ContentTypes.Post, ids, currentUserId)
            : new Dictionary<long, Knome.API.DTOs.Interactions.ContentSummaryDto>();

        var dtos = new List<PostDto>();
        foreach (var p in posts)
        {
            var dto = _mapper.Map<PostDto>(p);
            dto.EngagementSummary = summaries.TryGetValue(p.PostId, out var s) ? s : new Knome.API.DTOs.Interactions.ContentSummaryDto { ContentType = ContentTypes.Post, ContentId = p.PostId };
            dtos.Add(dto);
        }

        return dtos;
    }

    public async Task<PostDto> CreatePostAsync(int currentUserId, CreatePostDto dto)
    {
        await _suspensionGuard.EnsureNotSuspendedAsync(currentUserId);

        // Security screening (FR-SM-01)
        var secCheck = await _interactionService.ValidateContentSecurityAsync(dto.ContentText, dto.AttachmentUrls.FirstOrDefault());
        if (!secCheck.IsValid)
            throw new BadRequestException("Post content or attachments contain blocked URLs or restricted keywords.");

        var post = new Post
        {
            AuthorUserId = currentUserId,
            ContentText = dto.ContentText,
            AudienceType = dto.AudienceType,
            Status = dto.Status,
            PublishedDate = dto.Status == PostStatuses.Published ? DateTime.UtcNow : null,
            CreatedDate = DateTime.UtcNow
        };

        var allTargetedUserIds = (dto.MentionedUserIds ?? new List<int>())
            .Concat(dto.AudienceUserIds ?? new List<int>())
            .Distinct()
            .ToList();

        var savedPost = await _repo.AddPostAsync(post, dto.AttachmentUrls, dto.AttachmentTypes, allTargetedUserIds);
        await _karmaService.AwardKarmaAsync(currentUserId, KarmaActivityTypes.CreatePost, KarmaPoints.CreatePostPoints, ContentTypes.Post, savedPost.PostId, KarmaCaps.CreatePostDailyCap);
        if (dto.AudienceCommunityIds != null && dto.AudienceCommunityIds.Any())
        {
            foreach (var commId in dto.AudienceCommunityIds)
            {
                await _karmaService.AwardCommunityParticipationAsync(currentUserId, commId);
            }
        }

        // FR-NT-01: notify mentioned & targeted users (producer -> generic engine)
        if (allTargetedUserIds.Any())
        {
            var authorName = (await _db.Users.FindAsync(currentUserId))?.FullName ?? "Someone";
            foreach (var targetUserId in allTargetedUserIds.Where(id => id != currentUserId))
            {
                await _notificationService.PublishAsync(
                    targetUserId,
                    NotificationTypes.Mention,
                    dto.AudienceType == "Connections"
                        ? $"{authorName} shared a post with you."
                        : $"You were mentioned in a post by {authorName}.",
                    relatedContentType: ContentTypes.Post,
                    relatedContentId: savedPost.PostId);
            }
        }

        var resDto = _mapper.Map<PostDto>(savedPost);
        resDto.EngagementSummary = await _interactionService.GetContentSummaryAsync(ContentTypes.Post, savedPost.PostId, currentUserId);
        return resDto;
    }

    public async Task<PostDto> UpdatePostAsync(long postId, int currentUserId, UpdatePostDto dto)
    {
        var post = await _repo.GetPostByIdAsync(postId);
        if (post == null)
            throw new NotFoundException($"Post ID {postId} not found.");

        await CheckIsAuthorOrAdminAsync(post, currentUserId);

        var secCheck = await _interactionService.ValidateContentSecurityAsync(dto.ContentText, dto.AttachmentUrls.FirstOrDefault());
        if (!secCheck.IsValid)
            throw new BadRequestException("Updated post content or attachments contain blocked URLs or restricted keywords.");

        post.ContentText = dto.ContentText;
        post.AudienceType = dto.AudienceType;
        post.Status = dto.Status;
        if (dto.Status == PostStatuses.Published && post.PublishedDate == null)
            post.PublishedDate = DateTime.UtcNow;
        
        await _repo.UpdatePostAsync(post, dto.AttachmentUrls, dto.AttachmentTypes, dto.MentionedUserIds);

        var updated = await _repo.GetPostByIdAsync(postId);
        var resDto = _mapper.Map<PostDto>(updated!);
        resDto.EngagementSummary = await _interactionService.GetContentSummaryAsync(ContentTypes.Post, postId, currentUserId);
        return resDto;
    }

    public async Task DeletePostAsync(long postId, int currentUserId)
    {
        var post = await _repo.GetPostByIdAsync(postId);
        if (post == null)
            throw new NotFoundException($"Post ID {postId} not found.");

        await CheckIsAuthorOrAdminAsync(post, currentUserId);
        await _repo.DeletePostAsync(post);
    }
}
