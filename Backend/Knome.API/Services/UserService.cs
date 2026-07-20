using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Knome.API.Constants;
using Knome.API.Data;
using Knome.API.DTOs.User;
using Knome.API.Exceptions;
using Knome.API.Interfaces;
using Knome.API.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Knome.API.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepo;
    private readonly IFileStorageService _fileStorage;
    private readonly IMapper _mapper;
    private readonly IAuditLogService _auditLogService;
    private readonly KnomeDbContext _db;
    private readonly INotificationService _notificationService;

    public UserService(IUserRepository userRepo, IFileStorageService fileStorage, IMapper mapper, IAuditLogService auditLogService, KnomeDbContext db, INotificationService notificationService)
    {
        _userRepo = userRepo;
        _fileStorage = fileStorage;
        _mapper = mapper;
        _auditLogService = auditLogService;
        _db = db;
        _notificationService = notificationService;
    }

    public async Task<UserProfileDto> GetUserProfileAsync(int targetUserId, int requestingUserId)
    {
        var targetUser = await _userRepo.GetProfileByIdAsync(targetUserId);
        if (targetUser == null)
            throw new NotFoundException($"User with ID {targetUserId} not found.");

        var dto = _mapper.Map<UserProfileDto>(targetUser);

        if (targetUserId != requestingUserId)
        {
            dto.MutualConnectionsCount = await _userRepo.GetMutualConnectionsCountAsync(requestingUserId, targetUserId);
        }

        // Apply DPDP Act 2023 visibility enforcement per FR-UP-04
        if (targetUserId != requestingUserId)
        {
            var requestingUser = await _userRepo.GetProfileByIdAsync(requestingUserId);
            var isPrivilegedAdmin = requestingUser != null && requestingUser.Roles.Any(r =>
                r.RoleName == Roles.HRAdmin || r.RoleName == Roles.SystemAdmin);

            if (!isPrivilegedAdmin)
            {
                var isFollowing = targetUser.FollowerFollowingUsers.Any(f => f.FollowerUserId == requestingUserId);

                if (targetUser.BioVisibility == "Private" || (targetUser.BioVisibility == "Connections Only" && !isFollowing))
                {
                    dto.Bio = null;
                }

                if (targetUser.PhotosVisibility == "Private" || (targetUser.PhotosVisibility == "Connections Only" && !isFollowing))
                {
                    dto.ProfilePhotoUrl = null;
                }

                if (targetUser.InterestsVisibility == "Private" || (targetUser.InterestsVisibility == "Connections Only" && !isFollowing))
                {
                    dto.Interests.Clear();
                }
            }
        }

        return dto;
    }

    public async Task<UserProfileDto> UpdateProfileAsync(int userId, UpdateProfileDto dto)
    {
        var user = await _userRepo.GetProfileByIdAsync(userId);
        if (user == null)
            throw new NotFoundException($"User with ID {userId} not found.");

        if (dto.Bio != null) user.Bio = dto.Bio;
        if (dto.Location != null) user.Location = dto.Location;
        if (dto.MobileNo != null) user.MobileNo = dto.MobileNo;

        user.BioVisibility = dto.BioVisibility;
        user.NetworkVisibility = dto.NetworkVisibility;
        user.PhotosVisibility = dto.PhotosVisibility;
        user.InterestsVisibility = dto.InterestsVisibility;
        user.ModifiedDate = DateTime.UtcNow;

        _userRepo.Update(user);
        await _userRepo.SaveChangesAsync();

        if (dto.Skills != null)
        {
            await _userRepo.UpdateUserSkillsAsync(userId, dto.Skills);
        }

        if (dto.Interests != null)
        {
            await _userRepo.UpdateUserInterestsAsync(userId, dto.Interests);
        }

        return await GetUserProfileAsync(userId, userId);
    }

    public async Task<UserProfileDto> UpdateBioAsync(int userId, UpdateBioDto dto)
    {
        var user = await _userRepo.GetProfileByIdAsync(userId);
        if (user == null)
            throw new NotFoundException($"User with ID {userId} not found.");

        user.Bio = dto.Bio;
        user.BioVisibility = dto.BioVisibility;
        user.ModifiedDate = DateTime.UtcNow;

        _userRepo.Update(user);
        await _userRepo.SaveChangesAsync();

        return await GetUserProfileAsync(userId, userId);
    }

    public async Task<UserProfileDto> UpdateSkillsAsync(int userId, UpdateSkillsDto dto)
    {
        var user = await _userRepo.GetProfileByIdAsync(userId);
        if (user == null)
            throw new NotFoundException($"User with ID {userId} not found.");

        await _userRepo.UpdateUserSkillsAsync(userId, dto.Skills);

        user.ModifiedDate = DateTime.UtcNow;
        _userRepo.Update(user);
        await _userRepo.SaveChangesAsync();

        return await GetUserProfileAsync(userId, userId);
    }

    public async Task<UserProfileDto> UpdateProfileImageAsync(int userId, IFormFile file)
    {
        var user = await _userRepo.GetProfileByIdAsync(userId);
        if (user == null)
            throw new NotFoundException($"User with ID {userId} not found.");

        var newImageUrl = await _fileStorage.SaveProfileImageAsync(userId, file);

        if (!string.IsNullOrWhiteSpace(user.ProfilePhotoUrl))
        {
            await _fileStorage.DeleteProfileImageAsync(user.ProfilePhotoUrl);
        }

        user.ProfilePhotoUrl = newImageUrl;
        user.ModifiedDate = DateTime.UtcNow;

        _userRepo.Update(user);
        await _userRepo.SaveChangesAsync();

        return await GetUserProfileAsync(userId, userId);
    }

    public async Task<PagedResultDto<UserSummaryDto>> GetPagedUsersAsync(UserFilterDto filter)
    {
        var pagedUsers = await _userRepo.GetPagedUsersAsync(filter);
        var mappedItems = _mapper.Map<List<UserSummaryDto>>(pagedUsers.Items);

        return new PagedResultDto<UserSummaryDto>(
            mappedItems,
            pagedUsers.TotalCount,
            pagedUsers.PageNumber,
            pagedUsers.PageSize
        );
    }

    public async Task<UserProfileDto> ChangeDepartmentAsync(int userId, ChangeDepartmentDto dto)
    {
        var departmentExists = await _userRepo.DepartmentExistsAsync(dto.DepartmentId);
        if (!departmentExists)
            throw new BadRequestException($"Department with ID {dto.DepartmentId} does not exist.");

        var user = await _userRepo.GetProfileByIdAsync(userId);
        if (user == null)
            throw new NotFoundException($"User with ID {userId} not found.");

        user.DepartmentId = dto.DepartmentId;
        user.ModifiedDate = DateTime.UtcNow;

        _userRepo.Update(user);
        await _userRepo.SaveChangesAsync();

        return await GetUserProfileAsync(userId, userId);
    }

    public async Task<UserProfileDto> ChangeRolesAsync(int userId, ChangeRoleDto dto)
    {
        await _userRepo.UpdateUserRolesAsync(userId, dto.RoleNames);

        var user = await _userRepo.GetProfileByIdAsync(userId);
        if (user == null)
            throw new NotFoundException($"User with ID {userId} not found.");

        user.ModifiedDate = DateTime.UtcNow;
        _userRepo.Update(user);
        await _userRepo.SaveChangesAsync();

        return await GetUserProfileAsync(userId, userId);
    }

    public async Task<UserProfileDto> ActivateUserAsync(int actorUserId, int userId)
    {
        var user = await _userRepo.GetProfileByIdAsync(userId);
        if (user == null)
            throw new NotFoundException($"User with ID {userId} not found.");

        user.IsActive = true;
        user.IsPermanentlySuspended = false;
        user.SuspendedUntil = null;
        user.ModifiedDate = DateTime.UtcNow;

        _userRepo.Update(user);
        await _userRepo.SaveChangesAsync();

        await _auditLogService.RecordAsync(actorUserId, "ActivateUser", "User", userId, reason: "User reactivated.");

        return await GetUserProfileAsync(userId, userId);
    }

    public async Task<UserProfileDto> SuspendUserAsync(int actorUserId, int userId, SuspendUserDto dto)
    {
        var user = await _userRepo.GetProfileByIdAsync(userId);
        if (user == null)
            throw new NotFoundException($"User with ID {userId} not found.");

        if (dto.IsPermanent)
        {
            user.IsPermanentlySuspended = true;
            user.SuspendedUntil = null;
            user.IsActive = false;
        }
        else if (dto.SuspendedUntil.HasValue)
        {
            user.IsPermanentlySuspended = false;
            user.SuspendedUntil = dto.SuspendedUntil.Value;
            user.IsActive = false;
        }

        user.ModifiedDate = DateTime.UtcNow;

        _userRepo.Update(user);
        await _userRepo.SaveChangesAsync();

        await _auditLogService.RecordAsync(actorUserId, "SuspendUser", "User", userId, reason: dto.Reason);

        return await GetUserProfileAsync(userId, userId);
    }

    // --- Follow / Unfollow (FR-PN-01, FR-NT-01) ---
    public async Task FollowUserAsync(int followerUserId, int followingUserId)
    {
        if (followerUserId == followingUserId)
            throw new BadRequestException("You cannot follow yourself.");

        var target = await _userRepo.GetProfileByIdAsync(followingUserId);
        if (target is null)
            throw new NotFoundException($"User with ID {followingUserId} not found.");

        var already = await _userRepo.IsFollowingAsync(followerUserId, followingUserId);
        if (already)
            return; // idempotent

        await _userRepo.AddFollowerAsync(followerUserId, followingUserId);

        // FR-NT-01: notify the followed user (producer -> generic engine)
        var followerName = (await _userRepo.GetProfileByIdAsync(followerUserId))?.FullName ?? "Someone";
        await _notificationService.PublishAsync(
            followingUserId,
            NotificationTypes.Follower,
            $"{followerName} started following you.",
            relatedContentType: NotificationContentTypes.User,
            relatedContentId: followerUserId);
    }

    public async Task UnfollowUserAsync(int followerUserId, int followingUserId)
    {
        await _userRepo.RemoveFollowerAsync(followerUserId, followingUserId);
    }
}
