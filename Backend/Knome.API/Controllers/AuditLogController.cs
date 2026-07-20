using System.Threading.Tasks;
using Knome.API.Constants;
using Knome.API.DTOs.Audit;
using Knome.API.DTOs.User;
using Knome.API.Exceptions;
using Knome.API.Interfaces;
using Knome.API.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Knome.API.Controllers;

[ApiController]
[Route("api/audit")]
[Authorize(Roles = Roles.SystemAdmin)]
public class AuditLogController : KnomeControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    /// <summary>
    /// Lists audit-log entries with optional filtering (actor, action, target,
    /// date range) and pagination. Restricted to System Administrators.
    /// </summary>
    [HttpGet("logs")]
    [ProducesResponseType(typeof(ApiResponse<PagedResultDto<AuditLogDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLogs([FromQuery] AuditLogFilterDto filter)
    {
        var result = await _auditLogService.GetPagedAsync(filter);
        return Ok(ApiResponse<PagedResultDto<AuditLogDto>>.SuccessResponse(200, "Audit logs retrieved successfully.", result));
    }

    /// <summary>
    /// Retrieves a single audit-log entry by id. Restricted to System Administrators.
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
}
