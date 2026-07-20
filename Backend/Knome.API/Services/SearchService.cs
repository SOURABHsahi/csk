using System.Collections.Generic;
using System.Threading.Tasks;
using Knome.API.Constants;
using Knome.API.DTOs.Search;
using Knome.API.Interfaces;

namespace Knome.API.Services;

public class SearchService : ISearchService
{
    private readonly ISearchRepository _repository;
    private readonly IContentInteractionService _interactionService;

    public SearchService(ISearchRepository repository, IContentInteractionService interactionService)
    {
        _repository = repository;
        _interactionService = interactionService;
    }

    public async Task<GlobalSearchResultDto> SearchAsync(GlobalSearchRequestDto request)
    {
        var result = await _repository.SearchGlobalAsync(request);

        // Enrich the returned page of content hits with live engagement metrics.
        foreach (var item in result.Items)
        {
            var contentType = item.ContentType switch
            {
                "Post" => ContentTypes.Post,
                "Article" => ContentTypes.Article,
                "Video" => ContentTypes.Video,
                "Podcast" => ContentTypes.Podcast,
                _ => null
            };

            if (contentType is null) continue;

            var summary = await _interactionService.GetContentSummaryAsync(contentType, item.Id, 0);
            item.EngagementScore = summary.EngagementScore;
        }

        return result;
    }

    public async Task RecordSearchAsync(int userId, string term)
        => await _repository.RecordSearchAsync(userId, term);

    public async Task<List<SearchHistoryDto>> GetSearchHistoryAsync(int userId, int count = 10)
        => await _repository.GetRecentSearchesAsync(userId, count);

    public async Task<List<SearchItemDto>> SearchUsersAsync(string query, int pageNumber, int pageSize)
        => await _repository.SearchUsersAsync(query, pageNumber, pageSize);

    public async Task<List<SearchItemDto>> SearchCommunitiesAsync(string query, int pageNumber, int pageSize)
        => await _repository.SearchCommunitiesAsync(query, pageNumber, pageSize);

    public async Task<List<SearchItemDto>> SearchContentAsync(string query, string? contentType, int pageNumber, int pageSize)
        => await _repository.SearchContentAsync(query, contentType, pageNumber, pageSize);
}
