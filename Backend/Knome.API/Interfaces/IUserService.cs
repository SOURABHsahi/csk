using System.Threading.Tasks;
using Knome.API.DTOs.User;
using Microsoft.AspNetCore.Http;

namespace Knome.API.Interfaces;

public interface IUserService
{
    // Employee Self-Service Operations
    Task<UserProfileDto> GetUserProfileAsync(int targetUserId, int requestingUserId);
    Task<UserProfileDto> UpdateProfileAsync(int userId, UpdateProfileDto dto);
    Task<UserProfileDto> UpdateBioAsync(int userId, UpdateBioDto dto);
    Task<UserProfileDto> UpdateSkillsAsync(int userId, UpdateSkillsDto dto);
    Task<UserProfileDto> UpdateProfileImageAsync(int userId, IFormFile file);

    // HR Administrator Operations
    Task<PagedResultDto<UserSummaryDto>> GetPagedUsersAsync(UserFilterDto filter);
    Task<UserProfileDto> ChangeDepartmentAsync(int userId, ChangeDepartmentDto dto);
    Task<UserProfileDto> ChangeRolesAsync(int userId, ChangeRoleDto dto);
    Task<UserProfileDto> ActivateUserAsync(int actorUserId, int userId);
    Task<UserProfileDto> SuspendUserAsync(int actorUserId, int userId, SuspendUserDto dto);

    // Follow / Unfollow (FR-PN-01, FR-NT-01)
    Task FollowUserAsync(int followerUserId, int followingUserId);
    Task UnfollowUserAsync(int followerUserId, int followingUserId);
}
