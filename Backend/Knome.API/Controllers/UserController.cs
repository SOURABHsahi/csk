using System.Security.Claims;
using System.Threading.Tasks;
using Knome.API.Constants;
using Knome.API.DTOs.User;
using Knome.API.Exceptions;
using Knome.API.Interfaces;
using Knome.API.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Knome.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UserController : KnomeControllerBase
{
    private readonly IUserService _userService;

    public UserController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>
    /// Retrieves the current authenticated user's complete profile.
    /// </summary>
    [HttpGet("profile")]
    [ProducesResponseType(typeof(ApiResponse<UserProfileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyProfile()
    {
        var userId = GetCurrentUserId();
        var profile = await _userService.GetUserProfileAsync(userId, userId);
        return Ok(ApiResponse<UserProfileDto>.SuccessResponse(200, "Profile retrieved successfully.", profile));
    }

    /// <summary>
    /// Updates the current authenticated user's general profile (Bio, Location, MobileNo, Visibility, Skills, Interests).
    /// </summary>
    [HttpPut("profile")]
    [ProducesResponseType(typeof(ApiResponse<UserProfileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateProfileDto dto)
    {
        var userId = GetCurrentUserId();
        var updatedProfile = await _userService.UpdateProfileAsync(userId, dto);
        return Ok(ApiResponse<UserProfileDto>.SuccessResponse(200, "Profile updated successfully.", updatedProfile));
    }

    /// <summary>
    /// Updates the current authenticated user's Bio and BioVisibility.
    /// </summary>
    [HttpPut("profile/bio")]
    [ProducesResponseType(typeof(ApiResponse<UserProfileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateMyBio([FromBody] UpdateBioDto dto)
    {
        var userId = GetCurrentUserId();
        var updatedProfile = await _userService.UpdateBioAsync(userId, dto);
        return Ok(ApiResponse<UserProfileDto>.SuccessResponse(200, "Bio updated successfully.", updatedProfile));
    }

    /// <summary>
    /// Updates the current authenticated user's Skills list.
    /// </summary>
    [HttpPut("profile/skills")]
    [ProducesResponseType(typeof(ApiResponse<UserProfileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateMySkills([FromBody] UpdateSkillsDto dto)
    {
        var userId = GetCurrentUserId();
        var updatedProfile = await _userService.UpdateSkillsAsync(userId, dto);
        return Ok(ApiResponse<UserProfileDto>.SuccessResponse(200, "Skills updated successfully.", updatedProfile));
    }

    /// <summary>
    /// Uploads and updates the current authenticated user's Profile Image.
    /// </summary>
    [HttpPost("profile/image")]
    [ProducesResponseType(typeof(ApiResponse<UserProfileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadMyProfileImage([FromForm] UpdateProfileImageDto dto)
    {
        var userId = GetCurrentUserId();
        var updatedProfile = await _userService.UpdateProfileImageAsync(userId, dto.File);
        return Ok(ApiResponse<UserProfileDto>.SuccessResponse(200, "Profile image uploaded successfully.", updatedProfile));
    }

    /// <summary>
    /// Retrieves a paginated, filtered list of platform users. Restricted to HR Admins, System Admins, and Community Admins.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = Roles.HRAdmin + "," + Roles.SystemAdmin + "," + Roles.CommunityAdmin)]
    [ProducesResponseType(typeof(ApiResponse<PagedResultDto<UserSummaryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPagedUsers([FromQuery] UserFilterDto filter)
    {
        var result = await _userService.GetPagedUsersAsync(filter);
        return Ok(ApiResponse<PagedResultDto<UserSummaryDto>>.SuccessResponse(200, "Users retrieved successfully.", result));
    }

    /// <summary>
    /// Retrieves a specific user's profile by ID. Enforces DPDP Act 2023 visibility masking based on calling user.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<UserProfileDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUserProfileById(int id)
    {
        var requestingUserId = GetCurrentUserId();
        var profile = await _userService.GetUserProfileAsync(id, requestingUserId);
        return Ok(ApiResponse<UserProfileDto>.SuccessResponse(200, "User profile retrieved successfully.", profile));
    }

    /// <summary>
    /// Changes a user's department assignment. Restricted to HR Administrators and System Administrators.
    /// </summary>
    [HttpPut("{id:int}/department")]
    [Authorize(Roles = Roles.HRAdmin + "," + Roles.SystemAdmin)]
    [ProducesResponseType(typeof(ApiResponse<UserProfileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ChangeUserDepartment(int id, [FromBody] ChangeDepartmentDto dto)
    {
        var updatedProfile = await _userService.ChangeDepartmentAsync(id, dto);
        return Ok(ApiResponse<UserProfileDto>.SuccessResponse(200, "User department changed successfully.", updatedProfile));
    }

    /// <summary>
    /// Changes a user's role assignments. Restricted to HR Administrators and System Administrators.
    /// </summary>
    [HttpPut("{id:int}/roles")]
    [Authorize(Roles = Roles.HRAdmin + "," + Roles.SystemAdmin)]
    [ProducesResponseType(typeof(ApiResponse<UserProfileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ChangeUserRoles(int id, [FromBody] ChangeRoleDto dto)
    {
        var updatedProfile = await _userService.ChangeRolesAsync(id, dto);
        return Ok(ApiResponse<UserProfileDto>.SuccessResponse(200, "User roles changed successfully.", updatedProfile));
    }

    /// <summary>
    /// Reactivates a suspended or inactive user. Restricted to HR Administrators and System Administrators.
    /// </summary>
    [HttpPut("{id:int}/activate")]
    [Authorize(Roles = Roles.HRAdmin + "," + Roles.SystemAdmin)]
    [ProducesResponseType(typeof(ApiResponse<UserProfileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ActivateUser(int id)
    {
        var updatedProfile = await _userService.ActivateUserAsync(GetCurrentUserId(), id);
        return Ok(ApiResponse<UserProfileDto>.SuccessResponse(200, "User activated successfully.", updatedProfile));
    }

    /// <summary>
    /// Suspends a user temporarily or permanently per FR-SM-04. Restricted to HR Administrators and System Administrators.
    /// </summary>
    [HttpPut("{id:int}/suspend")]
    [Authorize(Roles = Roles.HRAdmin + "," + Roles.SystemAdmin)]
    [ProducesResponseType(typeof(ApiResponse<UserProfileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SuspendUser(int id, [FromBody] SuspendUserDto dto)
    {
        var updatedProfile = await _userService.SuspendUserAsync(GetCurrentUserId(), id, dto);
        return Ok(ApiResponse<UserProfileDto>.SuccessResponse(200, "User suspended successfully.", updatedProfile));
    }

    /// <summary>
    /// Follows the user with the given id (FR-PN-01). Triggers a "New Follower" notification (FR-NT-01).
    /// </summary>
    [HttpPost("{id:int}/follow")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<IActionResult> FollowUser(int id)
    {
        await _userService.FollowUserAsync(GetCurrentUserId(), id);
        return Ok(ApiResponse<bool>.SuccessResponse(200, "User followed successfully.", true));
    }

    /// <summary>
    /// Unfollows the user with the given id (FR-PN-01).
    /// </summary>
    [HttpDelete("{id:int}/follow")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UnfollowUser(int id)
    {
        await _userService.UnfollowUserAsync(GetCurrentUserId(), id);
        return Ok(ApiResponse<bool>.SuccessResponse(200, "User unfollowed successfully.", true));
    }

    /// <summary>
    /// Retrieves network suggestions for the current user.
    /// </summary>
    [HttpGet("suggestions")]
    [ProducesResponseType(typeof(ApiResponse<List<NetworkUserDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNetworkSuggestions([FromQuery] int limit = 10)
    {
        var suggestions = await _userService.GetNetworkSuggestionsAsync(GetCurrentUserId(), limit);
        return Ok(ApiResponse<List<NetworkUserDto>>.SuccessResponse(200, "Network suggestions retrieved successfully.", suggestions));
    }

    /// <summary>
    /// Retrieves the followers of a specific user.
    /// </summary>
    [HttpGet("{id:int}/followers")]
    [ProducesResponseType(typeof(ApiResponse<List<NetworkUserDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFollowers(int id)
    {
        var followers = await _userService.GetFollowersAsync(id);
        return Ok(ApiResponse<List<NetworkUserDto>>.SuccessResponse(200, "Followers retrieved successfully.", followers));
    }

    /// <summary>
    /// Retrieves the users that a specific user is following.
    /// </summary>
    [HttpGet("{id:int}/following")]
    [ProducesResponseType(typeof(ApiResponse<List<NetworkUserDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFollowing(int id)
    {
        var following = await _userService.GetFollowingAsync(id);
        return Ok(ApiResponse<List<NetworkUserDto>>.SuccessResponse(200, "Following retrieved successfully.", following));
    }

    /// <summary>
    /// Sends a connection request to another user (or auto-merges cross-requests).
    /// </summary>
    [HttpPost("{id:int}/connect")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ConnectUser(int id)
    {
        await _userService.SendConnectionRequestAsync(GetCurrentUserId(), id);
        return Ok(ApiResponse<bool>.SuccessResponse(200, "Connection request processed successfully.", true));
    }

    /// <summary>
    /// Cancels a pending sent connection request.
    /// </summary>
    [HttpDelete("{id:int}/connect/cancel")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CancelConnectionRequest(int id)
    {
        await _userService.CancelConnectionRequestAsync(GetCurrentUserId(), id);
        return Ok(ApiResponse<bool>.SuccessResponse(200, "Connection request canceled successfully.", true));
    }

    /// <summary>
    /// Removes a 1st-degree connection.
    /// </summary>
    [HttpDelete("{id:int}/connect")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<IActionResult> RemoveConnection(int id)
    {
        await _userService.RemoveConnectionAsync(GetCurrentUserId(), id);
        return Ok(ApiResponse<bool>.SuccessResponse(200, "Connection removed successfully.", true));
    }

    /// <summary>
    /// Accepts a pending connection request by requestId.
    /// </summary>
    [HttpPost("connect/accept/{requestId:int}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<IActionResult> AcceptConnectionRequest(int requestId)
    {
        await _userService.AcceptConnectionRequestAsync(GetCurrentUserId(), requestId);
        return Ok(ApiResponse<bool>.SuccessResponse(200, "Connection request accepted.", true));
    }

    /// <summary>
    /// Rejects a pending connection request by requestId.
    /// </summary>
    [HttpPost("connect/reject/{requestId:int}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<IActionResult> RejectConnectionRequest(int requestId)
    {
        await _userService.RejectConnectionRequestAsync(GetCurrentUserId(), requestId);
        return Ok(ApiResponse<bool>.SuccessResponse(200, "Connection request rejected.", true));
    }

    /// <summary>
    /// Retrieves pending connection requests (received and sent) for the current user.
    /// </summary>
    [HttpGet("connections/requests")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPendingRequests()
    {
        var received = await _userService.GetPendingReceivedRequestsAsync(GetCurrentUserId());
        var sent = await _userService.GetPendingSentRequestsAsync(GetCurrentUserId());
        return Ok(ApiResponse<object>.SuccessResponse(200, "Pending connection requests retrieved.", new { received, sent }));
    }

    /// <summary>
    /// Retrieves 1st-degree connections of a user.
    /// </summary>
    [HttpGet("{id:int}/connections")]
    [ProducesResponseType(typeof(ApiResponse<List<NetworkUserDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConnections(int id)
    {
        var connections = await _userService.GetConnectionsAsync(GetCurrentUserId(), id);
        return Ok(ApiResponse<List<NetworkUserDto>>.SuccessResponse(200, "Connections retrieved successfully.", connections));
    }
}
