using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using AutoMapper;
using Knome.API.Constants;
using Knome.API.DTOs.Interactions;
using Knome.API.Exceptions;
using Knome.API.Interfaces;
using Knome.API.Models;

using Microsoft.AspNetCore.SignalR;
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

    public ContentInteractionService(
        IContentInteractionRepository repo, 
        IUserRepository userRepo,
        IKarmaService karmaService, 
        IMapper mapper, 
        ISuspensionGuard suspensionGuard, 
        INotificationService notificationService,
        IHubContext<NotificationHub> hubContext)
    {
        _repo = repo;
        _userRepo = userRepo;
        _karmaService = karmaService;
        _mapper = mapper;
        _suspensionGuard = suspensionGuard;
        _notificationService = notificationService;
        _hubContext = hubContext;
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

    // --- Comments (FR-CI-02, FR-CI-05) ---
    public async Task<List<CommentDto>> GetContentCommentsAsync(string contentType, long contentId)
    {
        ValidateContentType(contentType);

        var topLevelComments = await _repo.GetTopLevelCommentsAsync(contentType, contentId);
        var dtos = new List<CommentDto>();

        foreach (var comment in topLevelComments)
        {
            var dto = _mapper.Map<CommentDto>(comment);
            var replies = await _repo.GetRepliesAsync(comment.CommentId);
            dto.Replies = _mapper.Map<List<CommentDto>>(replies);
            dto.RepliesCount = replies.Count;
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

            if (parent.ParentCommentId.HasValue)
                throw new BadRequestException("Comments can only be nested up to 2 levels (Top-level comment and Reply).");
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

        // If top-level, delete any child replies first or let cascading handle it cleanly
        var replies = await _repo.GetRepliesAsync(commentId);
        foreach (var reply in replies)
        {
            await _repo.DeleteCommentAsync(reply);
        }

        await _repo.DeleteCommentAsync(comment);
    }

    // --- Reactions (FR-CI-01) ---
    public async Task<(ReactionSummaryDto Summary, bool IsCreated)> ToggleReactionAsync(string contentType, long contentId, int userId, ToggleReactionDto dto)
    {
        await _suspensionGuard.EnsureNotSuspendedAsync(userId);
        ValidateContentType(contentType);

        bool isCreated = false;
        var existing = await _repo.GetUserReactionAsync(contentType, contentId, userId);
        if (existing != null)
        {
            if (existing.ReactionType == dto.ReactionType)
            {
                // Same reaction toggled -> remove reaction (Un-react)
                await _repo.RemoveReactionAsync(existing);
            }
            else
            {
                // Different reaction -> update type
                existing.ReactionType = dto.ReactionType;
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
                ReactionType = dto.ReactionType,
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

        var authorId = await _repo.GetContentAuthorUserIdAsync(contentType, contentId);
        if (authorId.HasValue && authorId.Value != userId)
        {
            await _karmaService.AwardKarmaAsync(authorId.Value, KarmaActivityTypes.ReceiveShare, KarmaPoints.ReceiveSharePoints, contentType, contentId);
        }

        // Send notification to the recipient if shared directly to a user
        if (dto.SharedToType == SharedToTypes.User && dto.SharedToId.HasValue)
        {
            var sharingUser = await _userRepo.GetProfileByIdAsync(userId);
            var sharingUserName = sharingUser?.FullName ?? "Someone";

            await _notificationService.PublishAsync(
                (int)dto.SharedToId.Value,
                NotificationTypes.Share,
                $"{sharingUserName} shared a {contentType.ToLower()} with you.",
                relatedContentType: contentType,
                relatedContentId: contentId);
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

        // Hot Posts formula: (Reactions * 3) + (Comments * 5) + (Shares * 4)
        var score = (reactionSummary.TotalCount * 3) + (commentsCount * 5) + (sharesCount * 4);

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
