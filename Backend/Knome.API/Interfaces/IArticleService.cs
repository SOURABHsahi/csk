using System.Collections.Generic;
using System.Threading.Tasks;
using Knome.API.DTOs.Articles;

namespace Knome.API.Interfaces;

public interface IArticleService
{
    Task<ArticleDetailDto> GetArticleAsync(long articleId, int currentUserId);
    Task<List<ArticleDto>> GetArticlesAsync(int? categoryId, string? tag, string? status, string? search, int pageNumber, int pageSize, int currentUserId);
    Task<List<ArticleDto>> GetMyArticlesAsync(int currentUserId, int pageNumber = 1, int pageSize = 20);
    Task<List<ArticleDto>> GetUserArticlesAsync(int authorUserId, int currentUserId, int pageNumber = 1, int pageSize = 20);
    Task<ArticleDetailDto> CreateArticleAsync(int currentUserId, CreateArticleDto dto);
    Task<ArticleDetailDto> UpdateArticleAsync(long articleId, int currentUserId, UpdateArticleDto dto);
    Task DeleteArticleAsync(long articleId, int currentUserId);
}
