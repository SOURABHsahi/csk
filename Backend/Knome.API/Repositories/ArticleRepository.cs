using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Knome.API.Data;
using Knome.API.Interfaces;
using Knome.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Knome.API.Repositories;

public class ArticleRepository : IArticleRepository
{
    private readonly KnomeDbContext _db;

    public ArticleRepository(KnomeDbContext db)
    {
        _db = db;
    }

    public async Task<Article?> GetArticleByIdAsync(long articleId)
    {
        return await _db.Articles
            .Include(a => a.AuthorUser)
            .Include(a => a.Category)
            .Include(a => a.ArticleTags)
            .Include(a => a.ArticleAttachments)
            .Include(a => a.ArticleVersions)
            .ThenInclude(v => v.EditedByUser)
            .FirstOrDefaultAsync(a => a.ArticleId == articleId);
    }

    public async Task<List<Article>> GetArticlesAsync(int? categoryId, string? tag, string? status, string? search, int pageNumber, int pageSize)
    {
        var query = _db.Articles
            .Include(a => a.AuthorUser)
            .Include(a => a.Category)
            .Include(a => a.ArticleTags)
            .Include(a => a.ArticleAttachments)
            .Include(a => a.ArticleVersions)
            .AsQueryable();

        if (categoryId.HasValue)
            query = query.Where(a => a.CategoryId == categoryId.Value);

        if (!string.IsNullOrWhiteSpace(tag))
            query = query.Where(a => a.ArticleTags.Any(t => t.Tag == tag));

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(a => a.Status == status);
        else
            query = query.Where(a => a.Status == "Published");

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(a => a.Title.Contains(search) || (a.Description != null && a.Description.Contains(search)));

        return await query
            .OrderByDescending(a => a.PublishedDate ?? a.CreatedDate)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<List<Article>> GetMyArticlesAsync(int authorUserId, int pageNumber = 1, int pageSize = 20)
    {
        return await _db.Articles
            .Include(a => a.AuthorUser)
            .Include(a => a.Category)
            .Include(a => a.ArticleTags)
            .Include(a => a.ArticleAttachments)
            .Include(a => a.ArticleVersions)
            .Where(a => a.AuthorUserId == authorUserId)
            .OrderByDescending(a => a.CreatedDate)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<Article> AddArticleAsync(Article article, List<string> tags, List<string> attachmentUrls, ArticleVersion initialVersion)
    {
        _db.Articles.Add(article);
        await _db.SaveChangesAsync();

        foreach (var t in tags.Distinct())
        {
            if (!string.IsNullOrWhiteSpace(t))
            {
                _db.ArticleTags.Add(new ArticleTag { ArticleId = article.ArticleId, Tag = t.Trim() });
            }
        }

        foreach (var url in attachmentUrls)
        {
            _db.ArticleAttachments.Add(new ArticleAttachment { ArticleId = article.ArticleId, FileUrl = url, FileType = "File" });
        }

        initialVersion.ArticleId = article.ArticleId;
        _db.ArticleVersions.Add(initialVersion);

        await _db.SaveChangesAsync();

        return (await GetArticleByIdAsync(article.ArticleId))!;
    }

    public async Task UpdateArticleAsync(Article article, List<string> tags, List<string> attachmentUrls, ArticleVersion? newVersionOrNull)
    {
        // Update tags
        var existingTags = await _db.ArticleTags.Where(at => at.ArticleId == article.ArticleId).ToListAsync();
        _db.ArticleTags.RemoveRange(existingTags);

        foreach (var t in tags.Distinct())
        {
            if (!string.IsNullOrWhiteSpace(t))
            {
                _db.ArticleTags.Add(new ArticleTag { ArticleId = article.ArticleId, Tag = t.Trim() });
            }
        }

        // Update attachments
        var existingAttachments = await _db.ArticleAttachments.Where(aa => aa.ArticleId == article.ArticleId).ToListAsync();
        _db.ArticleAttachments.RemoveRange(existingAttachments);

        foreach (var url in attachmentUrls)
        {
            _db.ArticleAttachments.Add(new ArticleAttachment { ArticleId = article.ArticleId, FileUrl = url, FileType = "File" });
        }

        if (newVersionOrNull != null)
        {
            newVersionOrNull.ArticleId = article.ArticleId;
            _db.ArticleVersions.Add(newVersionOrNull);
        }

        _db.Articles.Update(article);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteArticleAsync(Article article)
    {
        var versions = await _db.ArticleVersions.Where(av => av.ArticleId == article.ArticleId).ToListAsync();
        _db.ArticleVersions.RemoveRange(versions);

        var tags = await _db.ArticleTags.Where(at => at.ArticleId == article.ArticleId).ToListAsync();
        _db.ArticleTags.RemoveRange(tags);

        var attachments = await _db.ArticleAttachments.Where(aa => aa.ArticleId == article.ArticleId).ToListAsync();
        _db.ArticleAttachments.RemoveRange(attachments);

        // Remove Reactions
        var reactions = await _db.Reactions.Where(r => r.ContentId == article.ArticleId && r.ContentType == "Article").ToListAsync();
        _db.Reactions.RemoveRange(reactions);

        // Remove Comments
        var comments = await _db.Comments.Where(c => c.ContentId == article.ArticleId && c.ContentType == "Article").ToListAsync();
        _db.Comments.RemoveRange(comments);

        // Remove Bookmarks
        var bookmarks = await _db.Bookmarks.Where(b => b.ContentId == article.ArticleId && b.ContentType == "Article").ToListAsync();
        _db.Bookmarks.RemoveRange(bookmarks);

        // Remove Shares
        var shares = await _db.Shares.Where(s => s.ContentId == article.ArticleId && s.ContentType == "Article").ToListAsync();
        _db.Shares.RemoveRange(shares);

        // Remove KarmaTransactions
        var karmaTx = await _db.KarmaTransactions.Where(kt => kt.RelatedContentId == article.ArticleId && kt.RelatedContentType == "Article").ToListAsync();
        _db.KarmaTransactions.RemoveRange(karmaTx);

        _db.Articles.Remove(article);
        await _db.SaveChangesAsync();
    }

    public async Task IncrementViewCountAsync(long articleId)
    {
        var article = await _db.Articles.FindAsync(articleId);
        if (article != null)
        {
            article.ViewCount++;
            await _db.SaveChangesAsync();
        }
    }
}
