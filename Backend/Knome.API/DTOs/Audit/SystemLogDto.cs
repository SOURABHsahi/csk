using System;
using System.Collections.Generic;

namespace Knome.API.DTOs.Audit;

public class SystemLogEntryDto
{
    public string Timestamp { get; set; } = string.Empty;
    public string Level { get; set; } = "INF";
    public string SourceContext { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Exception { get; set; }
    public string Raw { get; set; } = string.Empty;
}

public class SystemLogCountsDto
{
    public int Total { get; set; }
    public int Errors { get; set; }
    public int Warnings { get; set; }
    public int Info { get; set; }
    public int Debug { get; set; }
}

public class SystemLogFileInfo
{
    public string FileName { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public DateTime LastModified { get; set; }
    public bool IsActive { get; set; }
}

public class SystemLogResponseDto
{
    public string LogFileName { get; set; } = string.Empty;
    public int TotalScannedLines { get; set; }
    public int ReturnedCount { get; set; }
    public SystemLogCountsDto Counts { get; set; } = new();
    public List<SystemLogFileInfo> AvailableFiles { get; set; } = new();
    public List<SystemLogEntryDto> Entries { get; set; } = new();
}
