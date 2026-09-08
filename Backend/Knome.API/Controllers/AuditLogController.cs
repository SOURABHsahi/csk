using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Knome.API.Constants;
using Knome.API.DTOs.Audit;
using Knome.API.DTOs.User;
using Knome.API.Exceptions;
using Knome.API.Interfaces;
using Knome.API.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Knome.API.Controllers;

[ApiController]
[Route("api/audit")]
[Authorize(Roles = Roles.SystemAdmin + "," + Roles.HRAdmin)]
public class AuditLogController : KnomeControllerBase
{
    private readonly IAuditLogService _auditLogService;
    private static readonly Regex LogLineRegex = new(
        @"^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?\s+[+-]\d{2}:\d{2})\s+\[([A-Z]{3})\]\s+(?:\[(.*?)\])?\s*(.*)$",
        RegexOptions.Compiled);

    public AuditLogController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    /// <summary>
    /// Lists database audit-log entries with optional filtering.
    /// </summary>
    [HttpGet("logs")]
    [ProducesResponseType(typeof(ApiResponse<PagedResultDto<AuditLogDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLogs([FromQuery] AuditLogFilterDto filter)
    {
        var result = await _auditLogService.GetPagedAsync(filter);
        return Ok(ApiResponse<PagedResultDto<AuditLogDto>>.SuccessResponse(200, "Audit logs retrieved successfully.", result));
    }

    /// <summary>
    /// Retrieves a single database audit-log entry by id.
    /// </summary>
    [HttpGet("logs/{id:long}")]
    [ProducesResponseType(typeof(ApiResponse<AuditLogDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLog(long id)
    {
        var log = await _auditLogService.GetByIdAsync(id);
        if (log is null)
            throw new NotFoundException($"Audit log ID {id} not found.");

        return Ok(ApiResponse<AuditLogDto>.SuccessResponse(200, "Audit log retrieved successfully.", log));
    }

    /// <summary>
    /// Creates a new database audit log entry.
    /// </summary>
    [HttpPost("logs")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateLog([FromBody] CreateAuditEntryDto dto)
    {
        int actorUserId = GetCurrentUserId();
        await _auditLogService.RecordAsync(actorUserId, dto.Action, dto.TargetType ?? "System", dto.TargetId, dto.Reason);
        return Ok(ApiResponse<string>.SuccessResponse(200, "Audit log saved to database successfully.", "Success"));
    }

    /// <summary>
    /// Retrieves live Serilog physical file logs parsed into structured entries.
    /// </summary>
    [HttpGet("system-logs")]
    [ProducesResponseType(typeof(ApiResponse<SystemLogResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSystemLogs(
        [FromQuery] int lines = 200,
        [FromQuery] string? level = null,
        [FromQuery] string? search = null,
        [FromQuery] string? logFile = null)
    {
        var logsDir = GetLogsDirectory();
        if (!Directory.Exists(logsDir))
        {
            return Ok(ApiResponse<SystemLogResponseDto>.SuccessResponse(200, "Logs directory not found.", new SystemLogResponseDto
            {
                LogFileName = "None",
                TotalScannedLines = 0,
                ReturnedCount = 0
            }));
        }

        var files = Directory.GetFiles(logsDir, "knome-*.log")
            .Select(f => new FileInfo(f))
            .OrderByDescending(f => f.LastWriteTimeUtc)
            .ToList();

        var availableFiles = files.Select((f, index) => new SystemLogFileInfo
        {
            FileName = f.Name,
            SizeBytes = f.Length,
            LastModified = f.LastWriteTime,
            IsActive = index == 0
        }).ToList();

        FileInfo? targetFile = null;
        if (!string.IsNullOrWhiteSpace(logFile))
        {
            var cleanFileName = Path.GetFileName(logFile);
            targetFile = files.FirstOrDefault(f => string.Equals(f.Name, cleanFileName, StringComparison.OrdinalIgnoreCase));
        }

        targetFile ??= files.FirstOrDefault();

        if (targetFile == null || !targetFile.Exists)
        {
            return Ok(ApiResponse<SystemLogResponseDto>.SuccessResponse(200, "No log files available.", new SystemLogResponseDto
            {
                AvailableFiles = availableFiles
            }));
        }

        var parsedEntries = new List<SystemLogEntryDto>();
        var counts = new SystemLogCountsDto();
        int totalScannedLines = 0;

        // Read log file safely with FileShare.ReadWrite so ongoing Serilog writes don't lock
        using (var fs = new FileStream(targetFile.FullName, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
        using (var reader = new StreamReader(fs))
        {
            string? rawLine;
            SystemLogEntryDto? currentEntry = null;

            while ((rawLine = await reader.ReadLineAsync()) != null)
            {
                totalScannedLines++;
                var match = LogLineRegex.Match(rawLine);

                if (match.Success)
                {
                    if (currentEntry != null)
                    {
                        parsedEntries.Add(currentEntry);
                        UpdateCounts(counts, currentEntry.Level);
                    }

                    currentEntry = new SystemLogEntryDto
                    {
                        Timestamp = match.Groups[1].Value.Trim(),
                        Level = match.Groups[2].Value.Trim().ToUpperInvariant(),
                        SourceContext = match.Groups[3].Success ? match.Groups[3].Value.Trim() : "Knome.API",
                        Message = match.Groups[4].Value.Trim(),
                        Raw = rawLine
                    };
                }
                else if (currentEntry != null && !string.IsNullOrWhiteSpace(rawLine))
                {
                    if (string.IsNullOrEmpty(currentEntry.Exception))
                    {
                        currentEntry.Exception = rawLine;
                    }
                    else
                    {
                        currentEntry.Exception += Environment.NewLine + rawLine;
                    }
                    currentEntry.Raw += Environment.NewLine + rawLine;
                }
            }

            if (currentEntry != null)
            {
                parsedEntries.Add(currentEntry);
                UpdateCounts(counts, currentEntry.Level);
            }
        }

        // Apply filters
        var filtered = parsedEntries.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(level) && !string.Equals(level, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            var targetLvl = level.Trim().ToUpperInvariant();
            if (targetLvl == "ERR" || targetLvl == "ERROR")
            {
                filtered = filtered.Where(e => e.Level == "ERR" || e.Level == "FTL");
            }
            else if (targetLvl == "WRN" || targetLvl == "WARN" || targetLvl == "WARNING")
            {
                filtered = filtered.Where(e => e.Level == "WRN");
            }
            else if (targetLvl == "INF" || targetLvl == "INFO" || targetLvl == "INFORMATION")
            {
                filtered = filtered.Where(e => e.Level == "INF");
            }
            else if (targetLvl == "DBG" || targetLvl == "DEBUG")
            {
                filtered = filtered.Where(e => e.Level == "DBG");
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var query = search.Trim();
            filtered = filtered.Where(e =>
                (e.Message != null && e.Message.Contains(query, StringComparison.OrdinalIgnoreCase)) ||
                (e.SourceContext != null && e.SourceContext.Contains(query, StringComparison.OrdinalIgnoreCase)) ||
                (e.Exception != null && e.Exception.Contains(query, StringComparison.OrdinalIgnoreCase)) ||
                (e.Timestamp != null && e.Timestamp.Contains(query, StringComparison.OrdinalIgnoreCase)));
        }

        // Return latest entries first (reversed) up to requested limit
        var resultEntries = filtered.Reverse().Take(Math.Clamp(lines, 10, 2000)).ToList();

        var response = new SystemLogResponseDto
        {
            LogFileName = targetFile.Name,
            TotalScannedLines = totalScannedLines,
            ReturnedCount = resultEntries.Count,
            Counts = counts,
            AvailableFiles = availableFiles,
            Entries = resultEntries
        };

        return Ok(ApiResponse<SystemLogResponseDto>.SuccessResponse(200, "System logs retrieved successfully.", response));
    }

    /// <summary>
    /// Lists all available Serilog log files on disk.
    /// </summary>
    [HttpGet("system-logs/files")]
    [ProducesResponseType(typeof(ApiResponse<List<SystemLogFileInfo>>), StatusCodes.Status200OK)]
    public IActionResult GetSystemLogFiles()
    {
        var logsDir = GetLogsDirectory();
        if (!Directory.Exists(logsDir))
        {
            return Ok(ApiResponse<List<SystemLogFileInfo>>.SuccessResponse(200, "Logs directory not found.", new List<SystemLogFileInfo>()));
        }

        var files = Directory.GetFiles(logsDir, "knome-*.log")
            .Select(f => new FileInfo(f))
            .OrderByDescending(f => f.LastWriteTimeUtc)
            .Select((f, index) => new SystemLogFileInfo
            {
                FileName = f.Name,
                SizeBytes = f.Length,
                LastModified = f.LastWriteTime,
                IsActive = index == 0
            }).ToList();

        return Ok(ApiResponse<List<SystemLogFileInfo>>.SuccessResponse(200, "System log files retrieved successfully.", files));
    }

    /// <summary>
    /// Downloads a raw Serilog log file.
    /// </summary>
    [HttpGet("system-logs/download")]
    public IActionResult DownloadSystemLog([FromQuery] string? logFile = null)
    {
        var logsDir = GetLogsDirectory();
        if (!Directory.Exists(logsDir))
            throw new NotFoundException("Logs directory does not exist.");

        var cleanFileName = string.IsNullOrWhiteSpace(logFile)
            ? Directory.GetFiles(logsDir, "knome-*.log").Select(Path.GetFileName).OrderByDescending(x => x).FirstOrDefault()
            : Path.GetFileName(logFile);

        if (string.IsNullOrEmpty(cleanFileName))
            throw new NotFoundException("No log file found.");

        var fullPath = Path.Combine(logsDir, cleanFileName);
        if (!System.IO.File.Exists(fullPath))
        {
            var archiveDir = @"\\172.16.8.11\Services\INTERNSHIP 2.0\Higher_Education\Knowme Summary\quick links backup\logs backup";
            var archivePath = Path.Combine(archiveDir, cleanFileName);
            if (System.IO.File.Exists(archivePath))
            {
                fullPath = archivePath;
            }
            else
            {
                throw new NotFoundException($"Log file '{cleanFileName}' not found.");
            }
        }

        var fs = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
        return File(fs, "text/plain", cleanFileName);
    }

    private static void UpdateCounts(SystemLogCountsDto counts, string level)
    {
        counts.Total++;
        switch (level)
        {
            case "ERR":
            case "FTL":
                counts.Errors++;
                break;
            case "WRN":
                counts.Warnings++;
                break;
            case "INF":
                counts.Info++;
                break;
            case "DBG":
                counts.Debug++;
                break;
        }
    }

    private static string GetLogsDirectory()
    {
        var networkLogs = @"\\172.16.8.11\Services\INTERNSHIP 2.0\Higher_Education\Knowme Summary\quick links\knome\logs";
        if (Directory.Exists(networkLogs)) return networkLogs;

        var currentDirLogs = Path.Combine(Directory.GetCurrentDirectory(), "logs");
        if (Directory.Exists(currentDirLogs)) return currentDirLogs;

        var baseDirLogs = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logs");
        if (Directory.Exists(baseDirLogs)) return baseDirLogs;

        return currentDirLogs;
    }
}

public class CreateAuditEntryDto
{
    public string Action { get; set; } = null!;
    public string? TargetType { get; set; }
    public long TargetId { get; set; }
    public string? Reason { get; set; }
}
