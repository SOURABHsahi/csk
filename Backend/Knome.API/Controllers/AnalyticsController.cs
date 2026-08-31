using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Knome.API.Constants;
using Knome.API.Data;
using Knome.API.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Knome.API.Controllers;

/// <summary>
/// HR Analytics &amp; Reporting controller for platform metrics and insights.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = Roles.HRAdmin + "," + Roles.SystemAdmin + "," + Roles.CommunityAdmin)]
public class AnalyticsController : KnomeControllerBase
{
    private readonly KnomeDbContext _context;

    public AnalyticsController(KnomeDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// User engagement metrics (active users, total karma, karma distribution).
    /// </summary>
    [HttpGet("engagement")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEngagementMetrics()
    {
        var totalUsers = await _context.Users.CountAsync();
        var activeUsers = await _context.Users.CountAsync(u => u.IsActive && !u.IsPermanentlySuspended);
        var suspendedUsers = await _context.Users.CountAsync(u => !u.IsActive || u.IsPermanentlySuspended);
        
        var karmaStats = await _context.KarmaBalances
            .Select(k => k.TotalPoints)
            .ToListAsync();

        var metrics = new
        {
            TotalUsers = totalUsers,
            ActiveUsers = activeUsers,
            SuspendedUsers = suspendedUsers,
            TotalKarmaDistributed = karmaStats.Sum(),
            AverageKarmaPerUser = karmaStats.Count > 0 ? (int)karmaStats.Average() : 0,
            KarmaTiers = new
            {
                Bronze = karmaStats.Count(k => k <= 250),
                Silver = karmaStats.Count(k => k > 250 && k <= 1000),
                Gold = karmaStats.Count(k => k > 1000 && k <= 5000),
                Platinum = karmaStats.Count(k => k > 5000)
            }
        };

        return Ok(ApiResponse<object>.SuccessResponse(200, "Engagement metrics retrieved successfully.", metrics));
    }

    /// <summary>
    /// Community health metrics (member counts, community activity).
    /// </summary>
    [HttpGet("community-health")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCommunityHealthMetrics()
    {
        var totalCommunities = await _context.Communities.CountAsync();
        var totalMemberships = await _context.CommunityMembers.CountAsync(cm => cm.Status == "Active");

        var communitiesSummary = await _context.Communities
            .Select(c => new
            {
                c.CommunityId,
                c.Name,
                AccessType = c.CommunityType,
                MembersCount = c.CommunityMembers.Count(m => m.Status == "Active"),
                PostsCount = c.Posts.Count
            })
            .OrderByDescending(c => c.MembersCount)
            .Take(10)
            .ToListAsync();

        var metrics = new
        {
            TotalCommunities = totalCommunities,
            TotalMemberships = totalMemberships,
            AverageMembersPerCommunity = totalCommunities > 0 ? totalMemberships / totalCommunities : 0,
            TopCommunities = communitiesSummary
        };

        return Ok(ApiResponse<object>.SuccessResponse(200, "Community health metrics retrieved successfully.", metrics));
    }

    /// <summary>
    /// Content performance metrics (posts, articles, videos, podcasts, reactions count).
    /// </summary>
    [HttpGet("content-performance")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetContentPerformanceMetrics()
    {
        var postsCount = await _context.Posts.CountAsync();
        var articlesCount = await _context.Articles.CountAsync();
        var videosCount = await _context.Videos.CountAsync();
        var podcastsCount = await _context.Podcasts.CountAsync();
        var reactionsCount = await _context.Reactions.CountAsync();
        var commentsCount = await _context.Comments.CountAsync();

        var metrics = new
        {
            TotalPosts = postsCount,
            TotalArticles = articlesCount,
            TotalVideos = videosCount,
            TotalPodcasts = podcastsCount,
            TotalReactions = reactionsCount,
            TotalComments = commentsCount,
            TotalContentCount = postsCount + articlesCount + videosCount + podcastsCount
        };

        return Ok(ApiResponse<object>.SuccessResponse(200, "Content performance metrics retrieved successfully.", metrics));
    }
}
