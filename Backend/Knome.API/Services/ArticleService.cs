using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Knome.API.Constants;
using Knome.API.Data;
using Knome.API.DTOs.Articles;
using Knome.API.Exceptions;
using Knome.API.Interfaces;
using Knome.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Knome.API.Services;

public class ArticleService : IArticleService
{
    private readonly IArticleRepository _repo;
    private readonly IContentInteractionService _interactionService;
    private readonly IKarmaService _karmaService;
    private readonly KnomeDbContext _db;
    private readonly IMapper _mapper;
    private readonly ISuspensionGuard _suspensionGuard;

    public ArticleService(IArticleRepository repo, IContentInteractionService interactionService, IKarmaService karmaService, KnomeDbContext db, IMapper mapper, ISuspensionGuard suspensionGuard)
    {
        _repo = repo;
        _interactionService = interactionService;
        _karmaService = karmaService;
        _db = db;
        _mapper = mapper;
        _suspensionGuard = suspensionGuard;
    }

    private async Task CheckIsAuthorOrAdminAsync(Article article, int currentUserId)
    {
        if (article.AuthorUserId == currentUserId) return;

        var user = await _db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.UserId == currentUserId);
        if (user == null || !user.Roles.Any(r => r.RoleName == Roles.SystemAdmin || r.RoleCode == "SYSADM" || r.RoleName == Roles.HRAdmin || r.RoleCode == "HRADM" || r.RoleName == Roles.CommunityAdmin || r.RoleCode == "CADM"))
        {
            throw new UnauthorizedException("You must be the author of this article or an Administrator to modify/delete it.");
        }
    }

    private int CalculateAvgReadTimeSeconds(string html)
    {
        if (string.IsNullOrWhiteSpace(html)) return 0;
        var words = html.Split(new[] { ' ', '\n', '\r', '\t', '<', '>' }, StringSplitOptions.RemoveEmptyEntries);
        // Assuming average reading speed of 200 words per minute (~3.33 words per second)
        return (int)Math.Ceiling(words.Length / 3.33);
    }

    public async Task<ArticleDetailDto> GetArticleAsync(long articleId, int currentUserId)
    {
        var article = await _repo.GetArticleByIdAsync(articleId);
        if (article == null)
            throw new NotFoundException($"Article ID {articleId} not found.");

        await _repo.IncrementViewCountAsync(articleId);

        // Reload or update ViewCount property locally for DTO representation
        article.ViewCount++;

        var dto = _mapper.Map<ArticleDetailDto>(article);
        dto.EngagementSummary = await _interactionService.GetContentSummaryAsync(ContentTypes.Article, articleId, currentUserId);
        return dto;
    }

    public async Task<List<ArticleDto>> GetArticlesAsync(int? categoryId, string? tag, string? status, string? search, int pageNumber, int pageSize, int currentUserId)
    {
        var articles = await _repo.GetArticlesAsync(categoryId, tag, status, search, pageNumber, pageSize);
        var dtos = new List<ArticleDto>();

        foreach (var a in articles)
        {
            var dto = _mapper.Map<ArticleDto>(a);
            dto.EngagementSummary = await _interactionService.GetContentSummaryAsync(ContentTypes.Article, a.ArticleId, currentUserId);
            dtos.Add(dto);
        }

        return dtos;
    }

    public async Task<List<ArticleDto>> GetMyArticlesAsync(int currentUserId, int pageNumber = 1, int pageSize = 20)
    {
        return await GetUserArticlesAsync(currentUserId, currentUserId, pageNumber, pageSize);
    }

    public async Task<List<ArticleDto>> GetUserArticlesAsync(int authorUserId, int currentUserId, int pageNumber = 1, int pageSize = 20)
    {
        var articles = await _repo.GetMyArticlesAsync(authorUserId, pageNumber, pageSize);
        var dtos = new List<ArticleDto>();

        foreach (var a in articles)
        {
            var dto = _mapper.Map<ArticleDto>(a);
            dto.EngagementSummary = await _interactionService.GetContentSummaryAsync(ContentTypes.Article, a.ArticleId, currentUserId);
            dtos.Add(dto);
        }

        return dtos;
    }

    public async Task<ArticleDetailDto> CreateArticleAsync(int currentUserId, CreateArticleDto dto)
    {
        await _suspensionGuard.EnsureNotSuspendedAsync(currentUserId);

        // Security screening (FR-SM-01)
        var secCheck = await _interactionService.ValidateContentSecurityAsync($"{dto.Title} {dto.Description} {dto.ContentHtml}", dto.AttachmentUrls.FirstOrDefault());
        if (!secCheck.IsValid)
            throw new BadRequestException("Article content or attachments contain blocked URLs or restricted keywords.");

        // FK existence validation (GBV-001)
        var categoryExists = await _db.Categories.AnyAsync(c => c.CategoryId == dto.CategoryId);
        if (!categoryExists)
            throw new BadRequestException($"Category ID {dto.CategoryId} does not exist.");

        var article = new Article
        {
            AuthorUserId = currentUserId,
            Title = dto.Title,
            Description = dto.Description,
            ContentHtml = dto.ContentHtml,
            CategoryId = dto.CategoryId,
            Status = dto.Status,
            PublishedDate = dto.Status == ArticleStatuses.Published ? DateTime.UtcNow : null,
            CreatedDate = DateTime.UtcNow,
            AvgReadTimeSeconds = CalculateAvgReadTimeSeconds(dto.ContentHtml),
            ViewCount = 0,
            UniqueReadCount = 0
        };

        var initialVersion = new ArticleVersion
        {
            ContentHtml = dto.ContentHtml,
            EditedByUserId = currentUserId,
            EditedDate = DateTime.UtcNow
        };

        var saved = await _repo.AddArticleAsync(article, dto.Tags, dto.AttachmentUrls, initialVersion);
        await _karmaService.AwardKarmaAsync(currentUserId, KarmaActivityTypes.CreateArticle, KarmaPoints.CreateArticlePoints, ContentTypes.Article, saved.ArticleId, KarmaCaps.CreateArticleDailyCap);

        var resDto = _mapper.Map<ArticleDetailDto>(saved);
        resDto.EngagementSummary = await _interactionService.GetContentSummaryAsync(ContentTypes.Article, saved.ArticleId, currentUserId);
        return resDto;
    }

    public async Task<ArticleDetailDto> UpdateArticleAsync(long articleId, int currentUserId, UpdateArticleDto dto)
    {
        var article = await _repo.GetArticleByIdAsync(articleId);
        if (article == null)
            throw new NotFoundException($"Article ID {articleId} not found.");

        await CheckIsAuthorOrAdminAsync(article, currentUserId);

        var secCheck = await _interactionService.ValidateContentSecurityAsync($"{dto.Title} {dto.Description} {dto.ContentHtml}", dto.AttachmentUrls.FirstOrDefault());
        if (!secCheck.IsValid)
            throw new BadRequestException("Updated article content or attachments contain blocked URLs or restricted keywords.");

        ArticleVersion? newVersion = null;
        if (article.ContentHtml != dto.ContentHtml)
        {
            newVersion = new ArticleVersion
            {
                ContentHtml = dto.ContentHtml,
                EditedByUserId = currentUserId,
                EditedDate = DateTime.UtcNow
            };
        }

        // FK existence validation (GBV-001)
        var categoryExists = await _db.Categories.AnyAsync(c => c.CategoryId == dto.CategoryId);
        if (!categoryExists)
            throw new BadRequestException($"Category ID {dto.CategoryId} does not exist.");

        article.Title = dto.Title;
        article.Description = dto.Description;
        article.ContentHtml = dto.ContentHtml;
        article.CategoryId = dto.CategoryId;
        article.Status = dto.Status;
        if (dto.Status == ArticleStatuses.Published && article.PublishedDate == null)
            article.PublishedDate = DateTime.UtcNow;
        article.AvgReadTimeSeconds = CalculateAvgReadTimeSeconds(dto.ContentHtml);

        await _repo.UpdateArticleAsync(article, dto.Tags, dto.AttachmentUrls, newVersion);

        var updated = await _repo.GetArticleByIdAsync(articleId);
        var resDto = _mapper.Map<ArticleDetailDto>(updated!);
        resDto.EngagementSummary = await _interactionService.GetContentSummaryAsync(ContentTypes.Article, articleId, currentUserId);
        return resDto;
    }

    public async Task DeleteArticleAsync(long articleId, int currentUserId)
    {
        var article = await _repo.GetArticleByIdAsync(articleId);
        if (article == null)
            throw new NotFoundException($"Article ID {articleId} not found.");

        await CheckIsAuthorOrAdminAsync(article, currentUserId);
        await _repo.DeleteArticleAsync(article);
    }
}
