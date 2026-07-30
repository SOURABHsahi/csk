using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Knome.API.Constants;
using Knome.API.Data;
using Knome.API.Interfaces;
using Knome.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Knome.API.Repositories;

public class PostRepository : IPostRepository
{
    private readonly KnomeDbContext _db;

    public PostRepository(KnomeDbContext db)
    {
        _db = db;
    }

    public async Task<Post?> GetPostByIdAsync(long postId)
    {
        return await _db.Posts
            .Include(p => p.AuthorUser)
            .Include(p => p.PostAttachments)
            .Include(p => p.MentionedUsers)
            .FirstOrDefaultAsync(p => p.PostId == postId);
    }

    public async Task<List<Post>> GetPostsAsync(string? audienceType, string? search, int pageNumber, int pageSize)
    {
        var query = _db.Posts
            .Include(p => p.AuthorUser)
            .Include(p => p.PostAttachments)
            .Include(p => p.MentionedUsers)
            .Where(p => string.IsNullOrEmpty(p.Status) || p.Status == "Published")
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(audienceType))
            query = query.Where(p => p.AudienceType == audienceType);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.ContentText.Contains(search));

        return await query
            .OrderByDescending(p => p.PublishedDate ?? p.CreatedDate)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<List<Post>> GetMyPostsAsync(int authorUserId, int pageNumber = 1, int pageSize = 20)
    {
        return await _db.Posts
            .Include(p => p.AuthorUser)
            .Include(p => p.PostAttachments)
            .Include(p => p.MentionedUsers)
            .Where(p => p.AuthorUserId == authorUserId)
            .OrderByDescending(p => p.CreatedDate)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<Post> AddPostAsync(Post post, List<string> attachmentUrls, List<string> attachmentTypes, List<int> mentionedUserIds)
    {
        _db.Posts.Add(post);
        await _db.SaveChangesAsync();

        for (int i = 0; i < attachmentUrls.Count; i++)
        {
            var url = attachmentUrls[i];
            var type = (attachmentTypes != null && i < attachmentTypes.Count) ? attachmentTypes[i] : AttachmentTypes.Document;
            
            _db.PostAttachments.Add(new PostAttachment
            {
                PostId = post.PostId,
                FileUrl = url,
                FileType = type,
                PublishedDate = DateTime.UtcNow
            });
        }

        if (mentionedUserIds.Any())
        {
            var users = await _db.Users.Where(u => mentionedUserIds.Contains(u.UserId)).ToListAsync();
            foreach (var u in users)
            {
                post.MentionedUsers.Add(u);
            }
        }

        await _db.SaveChangesAsync();

        return (await GetPostByIdAsync(post.PostId))!;
    }

    public async Task UpdatePostAsync(Post post, List<string> attachmentUrls, List<string> attachmentTypes, List<int> mentionedUserIds)
    {
        // Update attachments
        var existingAttachments = await _db.PostAttachments.Where(pa => pa.PostId == post.PostId).ToListAsync();
        _db.PostAttachments.RemoveRange(existingAttachments);

        for (int i = 0; i < attachmentUrls.Count; i++)
        {
            var url = attachmentUrls[i];
            var type = (attachmentTypes != null && i < attachmentTypes.Count) ? attachmentTypes[i] : AttachmentTypes.Document;
            
            _db.PostAttachments.Add(new PostAttachment
            {
                PostId = post.PostId,
                FileUrl = url,
                FileType = type,
                PublishedDate = DateTime.UtcNow
            });
        }

        // Update mentions
        post.MentionedUsers.Clear();
        if (mentionedUserIds.Any())
        {
            var users = await _db.Users.Where(u => mentionedUserIds.Contains(u.UserId)).ToListAsync();
            foreach (var u in users)
            {
                post.MentionedUsers.Add(u);
            }
        }

        _db.Posts.Update(post);
        await _db.SaveChangesAsync();
    }

    public async Task DeletePostAsync(Post post)
    {
        // Remove community post mappings first
        var communityPosts = await _db.CommunityPosts.Where(cp => cp.PostId == post.PostId).ToListAsync();
        _db.CommunityPosts.RemoveRange(communityPosts);

        // Remove attachments first
        var attachments = await _db.PostAttachments.Where(pa => pa.PostId == post.PostId).ToListAsync();
        _db.PostAttachments.RemoveRange(attachments);

        // Remove Reactions
        var reactions = await _db.Reactions.Where(r => r.ContentId == post.PostId && r.ContentType == "Post").ToListAsync();
        _db.Reactions.RemoveRange(reactions);

        // Remove Comments
        var comments = await _db.Comments.Where(c => c.ContentId == post.PostId && c.ContentType == "Post").ToListAsync();
        _db.Comments.RemoveRange(comments);

        // Remove Bookmarks
        var bookmarks = await _db.Bookmarks.Where(b => b.ContentId == post.PostId && b.ContentType == "Post").ToListAsync();
        _db.Bookmarks.RemoveRange(bookmarks);

        // Remove Shares
        var shares = await _db.Shares.Where(s => s.ContentId == post.PostId && s.ContentType == "Post").ToListAsync();
        _db.Shares.RemoveRange(shares);

        // Remove KarmaTransactions
        var karmaTx = await _db.KarmaTransactions.Where(kt => kt.RelatedContentId == post.PostId && kt.RelatedContentType == "Post").ToListAsync();
        _db.KarmaTransactions.RemoveRange(karmaTx);

        _db.Posts.Remove(post);
        await _db.SaveChangesAsync();
    }
}
