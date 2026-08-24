using System;
using System.Threading;
using System.Threading.Tasks;
using Knome.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Knome.API.Background;

/// <summary>
/// Periodically moves historical transactional records (> 3 months) to the Knome_Archive database.
/// Enforces data retention and keeps the operational database fast and lean.
/// </summary>
public class DataArchivalHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DataArchivalHostedService> _logger;
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

    public DataArchivalHostedService(IServiceScopeFactory scopeFactory, ILogger<DataArchivalHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Initial warm-up delay after startup before running first archival cycle
        await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _logger.LogInformation("DataArchival: starting scheduled data archival cycle at {Time}", DateTime.UtcNow);

                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<KnomeDbContext>();

                // Execute stored procedure in primary database with extended command timeout for batch processing
                dbContext.Database.SetCommandTimeout(300);
                await dbContext.Database.ExecuteSqlRawAsync("EXEC dbo.sp_ArchiveKnomeData;", stoppingToken);

                _logger.LogInformation("DataArchival: completed scheduled data archival cycle successfully at {Time}", DateTime.UtcNow);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DataArchival: error occurred during data archival execution.");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }
}
