using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Knome.API.Constants;
using Knome.API.Data;
using Knome.API.Interfaces;
using Knome.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Knome.API.Repositories;

public class FeedRepository : IFeedRepository
{
    private readonly KnomeDbContext _db;

    public FeedRepository(KnomeDbContext db)
    {
        _db = db;
    }

    public async Task<List<int>> GetFollowedUserIdsAsync(int userId)
    {
        return await _db.Followers
            .Where(f => f.FollowerUserId == userId)
            .Select(f => f.FollowingUserId)
            .ToListAsync();
    }

    public async Task<List<int>> GetMyCommunityIdsAsync(int userId)
    {
        return await _db.CommunityMembers
            .Where(m => m.UserId == userId)
            .Select(m => m.CommunityId)
            .ToListAsync();
    }

    public async Task<List<Post>> GetCandidatePostsAsync(List<int> followedUserIds, List<int> myCommunityIds, int currentUserId, int limit)
    {
        var communityPostIds = await _db.CommunityPosts
            .Where(cp => myCommunityIds.Contains(cp.CommunityId))
            .Select(cp => cp.PostId)
            .ToListAsync();

        return await _db.Posts
            .Include(p => p.AuthorUser)
            .Include(p => p.PostAttachments)
            .Where(p => followedUserIds.Contains(p.AuthorUserId) ||
                        p.AuthorUserId == currentUserId ||
                        p.AudienceType == AudienceTypes.Everyone ||
                        communityPostIds.Contains(p.PostId))
            .OrderByDescending(p => p.CreatedDate)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<List<Article>> GetCandidateArticlesAsync(List<int> followedUserIds, int currentUserId, int limit)
    {
        return await _db.Articles
            .Include(a => a.AuthorUser)
            .Include(a => a.ArticleAttachments)
            .Where(a => a.Status == ArticleStatuses.Published &&
                        (followedUserIds.Contains(a.AuthorUserId) ||
                         a.AuthorUserId == currentUserId ||
                         true)) // Published enterprise articles
            .OrderByDescending(a => a.PublishedDate)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<List<Video>> GetCandidateVideosAsync(List<int> followedUserIds, int currentUserId, int limit)
    {
        return await _db.Videos
            .Include(v => v.UploaderUser)
            .Where(v => followedUserIds.Contains(v.UploaderUserId) ||
                        v.UploaderUserId == currentUserId ||
                        true) // Videos default to public enterprise sharing
            .OrderByDescending(v => v.UploadedDate)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<List<Podcast>> GetCandidatePodcastsAsync(List<int> followedUserIds, int currentUserId, int limit)
    {
        return await _db.Podcasts
            .Include(p => p.UploaderUser)
            .Where(p => followedUserIds.Contains(p.UploaderUserId) ||
                        p.UploaderUserId == currentUserId ||
                        true) // Podcasts default to public enterprise sharing
            .OrderByDescending(p => p.UploadedDate)
            .Take(limit)
            .ToListAsync();
    }

    public async Task UpdateOrAddHotScoreCacheAsync(HotPostsScoreCache cache)
    {
        var existing = await _db.HotPostsScoreCaches
            .FirstOrDefaultAsync(c => c.ContentType == cache.ContentType && c.ContentId == cache.ContentId && c.Window == cache.Window);

        if (existing != null)
        {
            existing.Score = cache.Score;
            existing.CalculatedAt = cache.CalculatedAt;
            _db.HotPostsScoreCaches.Update(existing);
        }
        else
        {
            _db.HotPostsScoreCaches.Add(cache);
        }
        await _db.SaveChangesAsync();
    }

    public async Task<List<HotPostsScoreCache>> GetCachedHotScoresAsync(string window, int limit)
    {
        return await _db.HotPostsScoreCaches
            .Where(c => c.Window == window)
            .OrderByDescending(c => c.Score)
            .Take(limit)
            .ToListAsync();
    }
}
