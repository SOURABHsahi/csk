using Knome.API.Constants;
using Knome.API.DTOs.Auth;
using Knome.API.Interfaces;
using Knome.API.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Knome.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : KnomeControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// Authenticate using Employee ID and password. Returns a JWT token.
    /// </summary>
    [HttpPost("login")]
    [EnableRateLimiting("LoginRateLimiter")]
    [ProducesResponseType(typeof(ApiResponse<LoginResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        var result = await _authService.LoginAsync(request);
        return Ok(ApiResponse<LoginResponseDto>.SuccessResponse(200, "Login successful.", result));
    }

    /// <summary>
    /// Invalidate the current session. The client must discard the token.
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public IActionResult Logout()
    {
        // JWT is stateless — logout is handled client-side by discarding the token.
        // When HRMS SSO is integrated, this endpoint will call the SSO logout flow.
        return Ok(ApiResponse.SuccessResponse(200, "Logged out successfully."));
    }

    /// <summary>
    /// Returns the authenticated user's profile derived from the JWT claims.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<CurrentUserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Me()
    {
        var userId = GetCurrentUserId();
        var currentUser = await _authService.GetCurrentUserAsync(userId);
        return Ok(ApiResponse<CurrentUserDto>.SuccessResponse(200, ApiConstants.Messages.Success, currentUser));
    }
}
