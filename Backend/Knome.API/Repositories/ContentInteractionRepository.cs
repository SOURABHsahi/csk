using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Knome.API.Constants;
using Knome.API.Data;
using Knome.API.DTOs.Interactions;
using Knome.API.Interfaces;
using Knome.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Knome.API.Repositories;

public class ContentInteractionRepository : IContentInteractionRepository
{
    private readonly KnomeDbContext _db;

    public ContentInteractionRepository(KnomeDbContext db)
    {
        _db = db;
    }

    // --- Comments ---
    public async Task<List<Comment>> GetTopLevelCommentsAsync(string contentType, long contentId)
    {
        return await _db.Comments
            .Include(c => c.User)
            .Include(c => c.InverseParentComment)
            .Where(c => c.ContentType == contentType && c.ContentId == contentId && c.ParentCommentId == null)
            .OrderByDescending(c => c.CreatedDate)
            .ToListAsync();
    }

    public async Task<List<Comment>> GetRepliesAsync(long parentCommentId)
    {
        return await _db.Comments
            .Include(c => c.User)
            .Where(c => c.ParentCommentId == parentCommentId)
            .OrderBy(c => c.CreatedDate)
            .ToListAsync();
    }

    public async Task<Comment?> GetCommentByIdAsync(long commentId)
    {
        return await _db.Comments
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.CommentId == commentId);
    }

    public async Task<Comment> AddCommentAsync(Comment comment)
    {
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();
        return comment;
    }

    public async Task UpdateCommentAsync(Comment comment)
    {
        _db.Comments.Update(comment);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteCommentAsync(Comment comment)
    {
        _db.Comments.Remove(comment);
        await _db.SaveChangesAsync();
    }

    public async Task<long> GetCommentsCountAsync(string contentType, long contentId)
    {
        return await _db.Comments
            .Where(c => c.ContentType == contentType && c.ContentId == contentId)
            .CountAsync();
    }

    // --- Reactions ---
    public async Task<Reaction?> GetUserReactionAsync(string contentType, long contentId, int userId)
    {
        return await _db.Reactions
            .FirstOrDefaultAsync(r => r.ContentType == contentType && r.ContentId == contentId && r.UserId == userId);
    }

    public async Task<Reaction> AddReactionAsync(Reaction reaction)
    {
        _db.Reactions.Add(reaction);
        await _db.SaveChangesAsync();
        return reaction;
    }

    public async Task RemoveReactionAsync(Reaction reaction)
    {
        _db.Reactions.Remove(reaction);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateReactionAsync(Reaction reaction)
    {
        _db.Reactions.Update(reaction);
        await _db.SaveChangesAsync();
    }

    public async Task<ReactionSummaryDto> GetReactionsSummaryAsync(string contentType, long contentId, int currentUserId)
    {
        var reactions = await _db.Reactions
            .Where(r => r.ContentType == contentType && r.ContentId == contentId)
            .ToListAsync();

        var summary = new ReactionSummaryDto
        {
            TotalCount = reactions.Count,
            LikeCount = reactions.Count(r => r.ReactionType == ReactionTypes.Like),
            CelebrateCount = reactions.Count(r => r.ReactionType == ReactionTypes.Celebrate),
            SupportCount = reactions.Count(r => r.ReactionType == ReactionTypes.Support),
            HeartCount = reactions.Count(r => r.ReactionType == ReactionTypes.Heart),
            CurrentUserReactionType = reactions.FirstOrDefault(r => r.UserId == currentUserId)?.ReactionType
        };

        return summary;
    }

    // --- Shares ---
    public async Task<Share> AddShareAsync(Share share)
    {
        _db.Shares.Add(share);
        await _db.SaveChangesAsync();
        return share;
    }

    public async Task<long> GetSharesCountAsync(string contentType, long contentId)
    {
        return await _db.Shares
            .Where(s => s.ContentType == contentType && s.ContentId == contentId)
            .CountAsync();
    }

    // --- Bookmarks ---
    public async Task<Bookmark?> GetBookmarkAsync(string contentType, long contentId, int userId)
    {
        return await _db.Bookmarks
            .FirstOrDefaultAsync(b => b.ContentType == contentType && b.ContentId == contentId && b.UserId == userId);
    }

    public async Task<Bookmark> AddBookmarkAsync(Bookmark bookmark)
    {
        _db.Bookmarks.Add(bookmark);
        await _db.SaveChangesAsync();
        return bookmark;
    }

    public async Task RemoveBookmarkAsync(Bookmark bookmark)
    {
        _db.Bookmarks.Remove(bookmark);
        await _db.SaveChangesAsync();
    }

    public async Task<List<Bookmark>> GetUserBookmarksAsync(int userId)
    {
        return await _db.Bookmarks
            .Include(b => b.User)
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.SavedDate)
            .ToListAsync();
    }

    // --- Moderation Reports ---
    public async Task<ModerationReport> AddReportAsync(ModerationReport report)
    {
        _db.ModerationReports.Add(report);
        await _db.SaveChangesAsync();
        return report;
    }

    public async Task<ModerationReport?> GetReportByIdAsync(long reportId)
    {
        return await _db.ModerationReports
            .Include(m => m.ReporterUser)
            .Include(m => m.ModeratorUser)
            .FirstOrDefaultAsync(m => m.ReportId == reportId);
    }

    public async Task<List<ModerationReport>> GetPendingReportsAsync(int pageNumber, int pageSize)
    {
        return await _db.ModerationReports
            .Include(m => m.ReporterUser)
            .Include(m => m.ModeratorUser)
            .Where(m => m.Status == ReportStatuses.Pending || m.Status == ReportStatuses.UnderReview)
            .OrderByDescending(m => m.ReportedDate)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task UpdateReportAsync(ModerationReport report)
    {
        _db.ModerationReports.Update(report);
        await _db.SaveChangesAsync();
    }

    // --- Security Screening ---
    public async Task<List<BlockedUrl>> GetAllBlockedUrlsAsync()
    {
        return await _db.BlockedUrls.AsNoTracking().ToListAsync();
    }

    public async Task<List<RestrictedKeyword>> GetAllRestrictedKeywordsAsync()
    {
        return await _db.RestrictedKeywords.AsNoTracking().ToListAsync();
    }

    // Author resolution (for notification targeting)
    public async Task<int?> GetContentAuthorUserIdAsync(string contentType, long contentId)
    {
        return contentType switch
        {
            ContentTypes.Post => await _db.Posts.Where(p => p.PostId == contentId).Select(p => (int?)p.AuthorUserId).FirstOrDefaultAsync(),
            ContentTypes.Article => await _db.Articles.Where(a => a.ArticleId == contentId).Select(a => (int?)a.AuthorUserId).FirstOrDefaultAsync(),
            ContentTypes.Video => await _db.Videos.Where(v => v.VideoId == contentId).Select(v => (int?)v.UploaderUserId).FirstOrDefaultAsync(),
            ContentTypes.Podcast => await _db.Podcasts.Where(p => p.PodcastId == contentId).Select(p => (int?)p.UploaderUserId).FirstOrDefaultAsync(),
            _ => null
        };
    }
}
