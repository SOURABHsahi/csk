using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Knome.API.DTOs.Search;
using Knome.API.Exceptions;
using Knome.API.Interfaces;
using Knome.API.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Knome.API.Controllers;

/// <summary>
/// Unified search &amp; discovery API for users, communities, posts, articles, videos, podcasts, and jobs.
/// </summary>
[ApiController]
[Route("api/search")]
[Authorize]
public class SearchController : KnomeControllerBase
{
    private readonly ISearchService _searchService;

    public SearchController(ISearchService searchService)
    {
        _searchService = searchService;
    }

    /// <summary>Unified, filtered, paginated search across all entity types.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<GlobalSearchResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Search([FromQuery] GlobalSearchRequestDto request)
    {
        var result = await _searchService.SearchAsync(request);

        if (!string.IsNullOrWhiteSpace(request.Query) && request.PageNumber == 1)
        {
            await _searchService.RecordSearchAsync(GetCurrentUserId(), request.Query.Trim());
        }

        return Ok(ApiResponse<GlobalSearchResultDto>.SuccessResponse(200, "Search results retrieved successfully.", result));
    }

    /// <summary>Search within platform users (by name, skills, location, department).</summary>
    [HttpGet("users")]
    [ProducesResponseType(typeof(ApiResponse<List<SearchItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchUsers([FromQuery] string? query, [FromQuery] string? department, [FromQuery] string? skills, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
    {
        var users = await _searchService.SearchUsersAsync(query ?? string.Empty, pageNumber, pageSize);
        return Ok(ApiResponse<List<SearchItemDto>>.SuccessResponse(200, "User search completed successfully.", users));
    }

    /// <summary>Search within active jobs.</summary>
    [HttpGet("jobs")]
    [ProducesResponseType(typeof(ApiResponse<List<SearchItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchJobs([FromQuery] string? query, [FromQuery] string? department, [FromQuery] string? location, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
    {
        var request = new GlobalSearchRequestDto
        {
            Query = query ?? string.Empty,
            ContentType = "Job",
            PageNumber = pageNumber,
            PageSize = pageSize
        };
        var result = await _searchService.SearchAsync(request);
        return Ok(ApiResponse<List<SearchItemDto>>.SuccessResponse(200, "Job search completed successfully.", result.Items));
    }

    /// <summary>Search within communities.</summary>
    [HttpGet("communities")]
    [ProducesResponseType(typeof(ApiResponse<List<SearchItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchCommunities([FromQuery] string? query, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
    {
        var communities = await _searchService.SearchCommunitiesAsync(query ?? string.Empty, pageNumber, pageSize);
        return Ok(ApiResponse<List<SearchItemDto>>.SuccessResponse(200, "Community search completed successfully.", communities));
    }

    /// <summary>Retrieves recent unique search terms for the calling user (up to 10).</summary>
    [HttpGet("history")]
    [ProducesResponseType(typeof(ApiResponse<List<SearchHistoryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSearchHistory([FromQuery] int count = 10)
    {
        var history = await _searchService.GetSearchHistoryAsync(GetCurrentUserId(), count);
        return Ok(ApiResponse<List<SearchHistoryDto>>.SuccessResponse(200, "Search history retrieved successfully.", history));
    }
}
