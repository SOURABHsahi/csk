using System;
using System.Threading;
using System.Threading.Tasks;
using Knome.API.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Knome.API.Background;

/// <summary>
/// Periodically checks and publishes scheduled posts whose scheduled time has arrived.
/// </summary>
public class ScheduledPostHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ScheduledPostHostedService> _logger;
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(15);

    public ScheduledPostHostedService(IServiceScopeFactory scopeFactory, ILogger<ScheduledPostHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var postRepo = scope.ServiceProvider.GetRequiredService<IPostRepository>();
                var publishedCount = await postRepo.PublishDueScheduledPostsAsync();
                if (publishedCount > 0)
                {
                    _logger.LogInformation("ScheduledContentPublisher: auto-published {Count} scheduled post(s) to live feed.", publishedCount);
                }

                var articleRepo = scope.ServiceProvider.GetRequiredService<IArticleRepository>();
                var publishedArticleCount = await articleRepo.PublishDueScheduledArticlesAsync();
                if (publishedArticleCount > 0)
                {
                    _logger.LogInformation("ScheduledContentPublisher: auto-published {Count} scheduled article(s) to live platform.", publishedArticleCount);
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "ScheduledPostPublisher: cycle notice.");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }
}
