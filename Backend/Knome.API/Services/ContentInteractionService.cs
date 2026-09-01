using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using AutoMapper;
using Knome.API.Constants;
using Knome.API.Data;
using Knome.API.DTOs.Interactions;
using Knome.API.Exceptions;
using Knome.API.Interfaces;
using Knome.API.Models;

using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Knome.API.Hubs;

namespace Knome.API.Services;

public class ContentInteractionService : IContentInteractionService
{
    private readonly IContentInteractionRepository _repo;
    private readonly IUserRepository _userRepo;
    private readonly IKarmaService _karmaService;
    private readonly IMapper _mapper;
    private readonly ISuspensionGuard _suspensionGuard;
    private readonly INotificationService _notificationService;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ICommunityRepository _communityRepo;
    private readonly KnomeDbContext _db;
    private readonly ILogger<ContentInteractionService> _logger;

    public ContentInteractionService(
        IContentInteractionRepository repo, 
        IUserRepository userRepo,
        IKarmaService karmaService, 
        IMapper mapper, 
        ISuspensionGuard suspensionGuard, 
        INotificationService notificationService,
        IHubContext<NotificationHub> hubContext,
        ICommunityRepository communityRepo,
        KnomeDbContext db,
        ILogger<ContentInteractionService> logger)
    {
        _repo = repo;
        _userRepo = userRepo;
        _karmaService = karmaService;
        _mapper = mapper;
        _suspensionGuard = suspensionGuard;
        _notificationService = notificationService;
        _hubContext = hubContext;
        _communityRepo = communityRepo;
        _db = db;
        _logger = logger;
    }

    // --- Security & Screening (FR-SM-01) ---
    public async Task<ContentValidationResultDto> ValidateContentSecurityAsync(string? text, string? url = null)
    {
        var result = new ContentValidationResultDto { IsValid = true };

        var blockedUrls = await _repo.GetAllBlockedUrlsAsync();
        var restrictedKeywords = await _repo.GetAllRestrictedKeywordsAsync();

        var combinedText = $"{text} {url}".Trim();
        if (string.IsNullOrEmpty(combinedText))
            return result;

        foreach (var bUrl in blockedUrls)
        {
            if (!string.IsNullOrWhiteSpace(bUrl.UrlPattern) &&
                combinedText.Contains(bUrl.UrlPattern, StringComparison.OrdinalIgnoreCase))
            {
                result.IsValid = false;
                result.BlockedUrlsFound.Add(bUrl.UrlPattern);
            }
        }

        foreach (var rKeyword in restrictedKeywords)
        {
            if (!string.IsNullOrWhiteSpace(rKeyword.Keyword))
            {
                var pattern = $@"\b{Regex.Escape(rKeyword.Keyword)}\b";
                if (Regex.IsMatch(combinedText, pattern, RegexOptions.IgnoreCase))
                {
                    result.IsValid = false;
                    result.RestrictedKeywordsFound.Add(rKeyword.Keyword);
                }
            }
        }

        return result;
    }

    private void ValidateContentType(string contentType)
    {
        if (!ContentTypes.IsValid(contentType))
            throw new BadRequestException($"Invalid content type '{contentType}'. Must be one of: {string.Join(", ", ContentTypes.All)}.");
    }

    private async Task<List<CommentDto>> BuildRepliesTreeAsync(long parentCommentId)
    {
        var replies = await _repo.GetRepliesAsync(parentCommentId);
        var replyDtos = new List<CommentDto>();

        foreach (var reply in replies)
        {
            var dto = _mapper.Map<CommentDto>(reply);
            dto.Replies = await BuildRepliesTreeAsync(reply.CommentId);
            dto.RepliesCount = dto.Replies.Count;
            replyDtos.Add(dto);
        }

        return replyDtos;
    }

    // --- Comments (FR-CI-02, FR-CI-05) ---
    public async Task<List<CommentDto>> GetContentCommentsAsync(string contentType, long contentId)
    {
        ValidateContentType(contentType);

        var topLevelComments = await _repo.GetTopLevelCommentsAsync(contentType, contentId);
        var dtos = new List<CommentDto>();

        foreach (var comment in topLevelComments)
        {
            var dto = _mapper.Map<CommentDto>(comment);
            dto.Replies = await BuildRepliesTreeAsync(comment.CommentId);
            dto.RepliesCount = dto.Replies.Count;
            dtos.Add(dto);
        }

        return dtos;
    }

    public async Task<CommentDto> AddCommentAsync(string contentType, long contentId, int userId, CreateCommentDto dto)
    {
        await _suspensionGuard.EnsureNotSuspendedAsync(userId);
        ValidateContentType(contentType);

        var securityCheck = await ValidateContentSecurityAsync(dto.CommentText, dto.ImageUrl);
        if (!securityCheck.IsValid)
            throw new BadRequestException("Comment contains blocked URLs or restricted keywords.");

        if (dto.ParentCommentId.HasValue)
        {
            var parent = await _repo.GetCommentByIdAsync(dto.ParentCommentId.Value);
            if (parent == null || parent.ContentType != contentType || parent.ContentId != contentId)
                throw new NotFoundException($"Parent comment ID {dto.ParentCommentId.Value} not found for this content.");
        }

        var comment = new Comment
        {
            ContentType = contentType,
            ContentId = contentId,
            UserId = userId,
            ParentCommentId = dto.ParentCommentId,
            CommentText = dto.CommentText,
            ImageUrl = dto.ImageUrl,
            CreatedDate = DateTime.UtcNow
        };

        var saved = await _repo.AddCommentAsync(comment);

        // Award karma to the user who added the comment
        await _karmaService.AwardKarmaAsync(userId, KarmaActivityTypes.AddComment, KarmaPoints.AddCommentPoints, contentType, contentId);

        var authorId = await _repo.GetContentAuthorUserIdAsync(contentType, contentId);
        if (authorId.HasValue && authorId.Value != userId)
        {
            await _karmaService.AwardKarmaAsync(authorId.Value, KarmaActivityTypes.ReceiveComment, KarmaPoints.ReceiveCommentPoints, contentType, contentId);
            await _notificationService.PublishAsync(
                authorId.Value,
                NotificationTypes.Comment,
                $"Your {contentType} received a new comment.",
                relatedContentType: contentType,
                relatedContentId: contentId);
        }
        if (dto.ParentCommentId.HasValue)
        {
            var parentComment = await _repo.GetCommentByIdAsync(dto.ParentCommentId.Value);
            if (parentComment != null && parentComment.UserId != userId && (!authorId.HasValue || parentComment.UserId != authorId.Value))
            {
                await _notificationService.PublishAsync(
                    parentComment.UserId,
                    NotificationTypes.Comment,
                    $"Someone replied to your comment on a {contentType}.",
                    relatedContentType: contentType,
                    relatedContentId: contentId);
            }
        }

        var reloaded = await _repo.GetCommentByIdAsync(saved.CommentId);

        // Real-time broadcast comment count update to all active users
        try
        {
            var topLevel = await _repo.GetTopLevelCommentsAsync(contentType, contentId);
            await _hubContext.Clients.All.SendAsync("CommentCountUpdated", new
            {
                contentType,
                contentId,
                commentsCount = topLevel.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast live CommentCountUpdated");
        }

        return _mapper.Map<CommentDto>(reloaded);
    }

    public async Task<CommentDto> UpdateCommentAsync(long commentId, int userId, UpdateCommentDto dto)
    {
        await _suspensionGuard.EnsureNotSuspendedAsync(userId);
        var comment = await _repo.GetCommentByIdAsync(commentId);
        if (comment == null)
            throw new NotFoundException($"Comment with ID {commentId} not found.");

        if (comment.UserId != userId)
            throw new UnauthorizedException("You can only modify your own comments.");

        var securityCheck = await ValidateContentSecurityAsync(dto.CommentText, dto.ImageUrl);
        if (!securityCheck.IsValid)
            throw new BadRequestException("Updated comment contains blocked URLs or restricted keywords.");

        comment.CommentText = dto.CommentText;
        comment.ImageUrl = dto.ImageUrl;

        await _repo.UpdateCommentAsync(comment);
        return _mapper.Map<CommentDto>(comment);
    }

    public async Task DeleteCommentAsync(long commentId, int userId, bool isAdmin = false)
    {
        await _suspensionGuard.EnsureNotSuspendedAsync(userId);
        var comment = await _repo.GetCommentByIdAsync(commentId);
        if (comment == null)
            throw new NotFoundException($"Comment with ID {commentId} not found.");

        if (comment.UserId != userId && !isAdmin)
            throw new UnauthorizedException("You do not have permission to delete this comment.");

        var cType = comment.ContentType;
        var cId = comment.ContentId;

        // If top-level, delete any child replies first or let cascading handle it cleanly
        var replies = await _repo.GetRepliesAsync(commentId);
        foreach (var reply in replies)
        {
            await _repo.DeleteCommentAsync(reply);
        }

        await _repo.DeleteCommentAsync(comment);

        // Real-time broadcast comment count update after deletion
        try
        {
            var topLevel = await _repo.GetTopLevelCommentsAsync(cType, cId);
            await _hubContext.Clients.All.SendAsync("CommentCountUpdated", new
            {
                contentType = cType,
                contentId = cId,
                commentsCount = topLevel.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast live CommentCountUpdated on delete");
        }
    }

    // --- Reactions (FR-CI-01) ---
    public async Task<(ReactionSummaryDto Summary, bool IsCreated)> ToggleReactionAsync(string contentType, long contentId, int userId, ToggleReactionDto dto)
    {
        ArgumentNullException.ThrowIfNull(dto);
        await _suspensionGuard.EnsureNotSuspendedAsync(userId);
        ValidateContentType(contentType);

        if (!string.IsNullOrEmpty(dto.ReactionType))
        {
            var match = ReactionTypes.All.FirstOrDefault(a => a.Equals(dto.ReactionType, StringComparison.OrdinalIgnoreCase));
            if (match != null) dto.ReactionType = match;
        }

        bool isCreated = false;
        var existing = await _repo.GetUserReactionAsync(contentType, contentId, userId);
        if (existing != null)
        {
            if (string.Equals(existing.ReactionType ?? string.Empty, dto.ReactionType ?? string.Empty, StringComparison.OrdinalIgnoreCase))
            {
                // Same reaction toggled -> remove reaction (Un-react)
                await _repo.RemoveReactionAsync(existing);
            }
            else
            {
                // Different reaction -> update type
                existing.ReactionType = dto.ReactionType ?? string.Empty;
                existing.CreatedDate = DateTime.UtcNow;
                await _repo.UpdateReactionAsync(existing);
            }
        }
        else
        {
            isCreated = true;
            var reaction = new Reaction
            {
                ContentType = contentType,
                ContentId = contentId,
                UserId = userId,
                ReactionType = dto.ReactionType ?? string.Empty,
                CreatedDate = DateTime.UtcNow
            };
            await _repo.AddReactionAsync(reaction);

            // Award karma to the user who reacted
            await _karmaService.AwardKarmaAsync(userId, KarmaActivityTypes.AddLike, KarmaPoints.AddLikePoints, contentType, contentId);

            // FR-NT-01: notify the content author of a new reaction and award ReceiveLike karma
            var authorId = await _repo.GetContentAuthorUserIdAsync(contentType, contentId);
            if (authorId.HasValue && authorId.Value != userId)
            {
                await _karmaService.AwardKarmaAsync(authorId.Value, KarmaActivityTypes.ReceiveLike, KarmaPoints.ReceiveLikePoints, contentType, contentId);
                await _notificationService.PublishAsync(
                    authorId.Value,
                    NotificationTypes.Reaction,
                    $"Your {contentType} received a new reaction.",
                    relatedContentType: contentType,
                    relatedContentId: contentId);
            }
        }

        var summary = await _repo.GetReactionsSummaryAsync(contentType, contentId, userId);

        // Real-time broadcast to all connected users
        try
        {
            await _hubContext.Clients.All.SendAsync("ReactionCountUpdated", new
            {
                contentType,
                contentId,
                totalLikes = summary.TotalCount,
                reactionsSummary = summary
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast live ReactionCountUpdated");
        }

        return (summary, isCreated);
    }

    public async Task<ReactionSummaryDto> GetReactionsSummaryAsync(string contentType, long contentId, int currentUserId)
    {
        ValidateContentType(contentType);
        return await _repo.GetReactionsSummaryAsync(contentType, contentId, currentUserId);
    }

    // --- Shares (FR-CI-03) ---
    public async Task<ShareDto> ShareContentAsync(string contentType, long contentId, int userId, CreateShareDto dto)
    {
        ValidateContentType(contentType);

        var share = new Share
        {
            ContentType = contentType,
            ContentId = contentId,
            UserId = userId,
            SharedToType = dto.SharedToType,
            SharedToId = dto.SharedToId,
            CreatedDate = DateTime.UtcNow
        };

        var saved = await _repo.AddShareAsync(share);

        // Award karma to the user who shared the content
        await _karmaService.AwardKarmaAsync(userId, KarmaActivityTypes.AddShare, KarmaPoints.AddSharePoints, contentType, contentId);

        var sharingUser = await _userRepo.GetProfileByIdAsync(userId);
        var sharingUserName = sharingUser?.FullName ?? "Someone";

        // Retrieve content title or snippet to include in notifications
        string contentTitle = "";
        try
        {
            if (contentType == ContentTypes.Post)
            {
                var p = await _db.Posts.FindAsync(contentId);
                if (p != null && !string.IsNullOrWhiteSpace(p.ContentText))
                {
                    contentTitle = p.ContentText.Length > 40 ? p.ContentText.Substring(0, 40) + "..." : p.ContentText;
                }
            }
            else if (contentType == ContentTypes.Article)
            {
                var a = await _db.Articles.FindAsync((int)contentId);
                if (a != null && !string.IsNullOrWhiteSpace(a.Title)) contentTitle = a.Title;
            }
            else if (contentType == ContentTypes.Video)
            {
                var v = await _db.Videos.FindAsync((int)contentId);
                if (v != null && !string.IsNullOrWhiteSpace(v.Title)) contentTitle = v.Title;
            }
            else if (contentType == ContentTypes.Podcast)
            {
                var pod = await _db.Podcasts.FindAsync((int)contentId);
                if (pod != null && !string.IsNullOrWhiteSpace(pod.Title)) contentTitle = pod.Title;
            }
        }
        catch { }

        var authorShareMsg = !string.IsNullOrWhiteSpace(contentTitle)
            ? $"{sharingUserName} shared your {contentType.ToLower()}: \"{contentTitle}\""
            : $"{sharingUserName} shared your {contentType.ToLower()}.";

        var recipientShareMsg = !string.IsNullOrWhiteSpace(contentTitle)
            ? $"{sharingUserName} shared a {contentType.ToLower()} with you: \"{contentTitle}\""
            : $"{sharingUserName} shared a {contentType.ToLower()} with you.";

        var authorId = await _repo.GetContentAuthorUserIdAsync(contentType, contentId);
        if (authorId.HasValue && authorId.Value != userId)
        {
            await _karmaService.AwardKarmaAsync(authorId.Value, KarmaActivityTypes.ReceiveShare, KarmaPoints.ReceiveSharePoints, contentType, contentId);
            // Notify the content author that their content was shared
            await _notificationService.PublishAsync(
                authorId.Value,
                NotificationTypes.Share,
                authorShareMsg,
                relatedContentType: contentType,
                relatedContentId: contentId);
        }

        // --- Share to a specific User: notify them ---
        if (dto.SharedToType == SharedToTypes.User && dto.SharedToId.HasValue)
        {
            await _notificationService.PublishAsync(
                (int)dto.SharedToId.Value,
                NotificationTypes.Share,
                recipientShareMsg,
                relatedContentType: contentType,
                relatedContentId: contentId);
        }
        // --- Share to Community: notify all members ---
        else if (dto.SharedToType == SharedToTypes.Community && dto.SharedToId.HasValue)
        {
            var commId = dto.SharedToId.Value;
            var memberIds = await _db.CommunityMembers
                .Where(m => m.CommunityId == commId && m.UserId != userId && m.Status == "Active")
                .Select(m => m.UserId)
                .ToListAsync();

            if (memberIds.Count > 0)
            {
                var commBroadcastMsg = !string.IsNullOrWhiteSpace(contentTitle)
                    ? $"{sharingUserName} shared a {contentType.ToLower()} in your community: \"{contentTitle}\""
                    : $"{sharingUserName} shared a post in your community.";

                await _notificationService.PublishBroadcastAsync(
                    NotificationTypes.Share,
                    commBroadcastMsg,
                    relatedContentType: ContentTypes.Post,
                    relatedContentId: contentId,
                    candidateUserIds: memberIds);
            }
        }

        // Real-time broadcast share count update to all active users
        try
        {
            var totalShares = await _db.Shares.CountAsync(s => s.ContentType == contentType && s.ContentId == contentId);
            await _hubContext.Clients.All.SendAsync("ShareCountUpdated", new
            {
                contentType,
                contentId,
                sharesCount = totalShares
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast live ShareCountUpdated");
        }

        return _mapper.Map<ShareDto>(saved);
    }

    // --- Bookmarks (FR-CI-04) & Saved Content ---
    public async Task<bool> ToggleBookmarkAsync(string contentType, long contentId, int userId)
    {
        ValidateContentType(contentType);

        var existing = await _repo.GetBookmarkAsync(contentType, contentId, userId);
        bool isBookmarked;
        if (existing != null)
        {
            await _repo.RemoveBookmarkAsync(existing);
            isBookmarked = false; // Unbookmarked
        }
        else
        {
            var bookmark = new Bookmark
            {
                UserId = userId,
                ContentType = contentType,
                ContentId = contentId,
                SavedDate = DateTime.UtcNow
            };

            await _repo.AddBookmarkAsync(bookmark);
            isBookmarked = true; // Bookmarked
        }

        // Real-time SignalR Broadcast across open tabs/devices of current user
        try
        {
            await _hubContext.Clients.Group($"User_{userId}").SendAsync("BookmarkUpdated", new
            {
                contentType,
                contentId,
                isBookmarked,
                savedDate = DateTime.UtcNow
            });
        }
        catch
        {
            // Non-blocking SignalR broadcast error handling
        }

        return isBookmarked;
    }

    public async Task<List<BookmarkDto>> GetMyBookmarksAsync(int userId)
    {
        var bookmarks = await _repo.GetUserBookmarksAsync(userId);
        return _mapper.Map<List<BookmarkDto>>(bookmarks);
    }

    public async Task<Responses.PagedResponse<SavedContentItemDto>> GetSavedContentItemsAsync(int userId, SavedContentQueryDto query)
    {
        var (items, totalCount) = await _repo.GetHydratedUserBookmarksAsync(userId, query);
        return Responses.PagedResponse<SavedContentItemDto>.Create(items, query.PageNumber, query.PageSize, totalCount);
    }

    public async Task<SavedContentCountDto> GetSavedContentCountsAsync(int userId)
    {
        return await _repo.GetSavedContentCountsAsync(userId);
    }

    public async Task<bool> GetBookmarkStatusAsync(string contentType, long contentId, int userId)
    {
        var bookmark = await _repo.GetBookmarkAsync(contentType, contentId, userId);
        return bookmark != null;
    }

    // --- Polymorphic Summary ---
    public async Task<ContentSummaryDto> GetContentSummaryAsync(string contentType, long contentId, int currentUserId)
    {
        ValidateContentType(contentType);

        var commentsCount = await _repo.GetCommentsCountAsync(contentType, contentId);
        var reactionSummary = await _repo.GetReactionsSummaryAsync(contentType, contentId, currentUserId);
        var sharesCount = await _repo.GetSharesCountAsync(contentType, contentId);
        var bookmark = await _repo.GetBookmarkAsync(contentType, contentId, currentUserId);

        // FR-HP-01 Hot Posts formula: (Views * 1) + (Reactions * 3) + (Comments * 5) + (Shares * 4)
        var views = await _repo.GetContentViewCountAsync(contentType, contentId);
        var score = (views * 1) + (reactionSummary.TotalCount * 3) + (commentsCount * 5) + (sharesCount * 4);

        return new ContentSummaryDto
        {
            ContentType = contentType,
            ContentId = contentId,
            CommentsCount = commentsCount,
            ReactionSummary = reactionSummary,
            SharesCount = sharesCount,
            IsBookmarkedByCurrentUser = bookmark != null,
            EngagementScore = score
        };
    }

    // --- Moderation & Governance (FR-SM-02) ---
    public async Task<ModerationReportDto> ReportContentAsync(string contentType, long contentId, int reporterUserId, CreateReportDto dto)
    {
        ValidateContentType(contentType);

        var report = new ModerationReport
        {
            ReporterUserId = reporterUserId,
            ContentType = contentType,
            ContentId = contentId,
            ReasonCode = dto.ReasonCode,
            Status = ReportStatuses.Pending,
            ReportedDate = DateTime.UtcNow
        };

        var saved = await _repo.AddReportAsync(report);
        var reloaded = await _repo.GetReportByIdAsync(saved.ReportId);
        return _mapper.Map<ModerationReportDto>(reloaded);
    }

    public async Task<List<ModerationReportDto>> GetPendingReportsAsync(int pageNumber, int pageSize)
    {
        var reports = await _repo.GetPendingReportsAsync(pageNumber, pageSize);
        return _mapper.Map<List<ModerationReportDto>>(reports);
    }

    public async Task<ModerationReportDto> ResolveReportAsync(long reportId, int moderatorUserId, ResolveReportDto dto)
    {
        var report = await _repo.GetReportByIdAsync(reportId);
        if (report == null)
            throw new NotFoundException($"Moderation report ID {reportId} not found.");

        report.Status = dto.Status;
        report.ModeratorUserId = moderatorUserId;
        report.ActionTaken = !string.IsNullOrEmpty(dto.ActionTaken) && dto.ActionTaken.Length > 40
            ? dto.ActionTaken.Substring(0, 40)
            : dto.ActionTaken;
        report.ActionDate = DateTime.UtcNow;

        await _repo.UpdateReportAsync(report);
        return _mapper.Map<ModerationReportDto>(report);
    }
}
