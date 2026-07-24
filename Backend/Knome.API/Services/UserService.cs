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

        dto.PostsCount = await _db.Posts.CountAsync(p => p.AuthorUserId == targetUserId);
        dto.CommonCommunitiesCount = await _db.CommunityMembers.CountAsync(c => c.UserId == targetUserId);

        if (targetUserId != requestingUserId)
        {
            dto.MutualConnectionsCount = await _userRepo.GetMutualConnectionsCountAsync(requestingUserId, targetUserId);
            
            var connectionRequest = await _userRepo.GetConnectionRequestAsync(requestingUserId, targetUserId) 
                                 ?? await _userRepo.GetConnectionRequestAsync(targetUserId, requestingUserId);

            if (connectionRequest != null && connectionRequest.Status == "Pending")
            {
                dto.ConnectionStatus = "Pending";
            }
            else if (await _userRepo.IsFollowingAsync(requestingUserId, targetUserId))
            {
                dto.ConnectionStatus = "Connected";
            }
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

    public async Task<System.Collections.Generic.List<NetworkUserDto>> GetNetworkSuggestionsAsync(int userId, int limit = 10)
    {
        var suggestions = await _userRepo.GetNetworkSuggestionsAsync(userId, limit);
        return await MapToNetworkUsersAsync(userId, suggestions, true);
    }

    public async Task<System.Collections.Generic.List<NetworkUserDto>> GetFollowersAsync(int userId)
    {
        var followers = await _userRepo.GetFollowersAsync(userId);
        return await MapToNetworkUsersAsync(userId, followers, false);
    }

    public async Task<System.Collections.Generic.List<NetworkUserDto>> GetFollowingAsync(int userId)
    {
        var following = await _userRepo.GetFollowingAsync(userId);
        return await MapToNetworkUsersAsync(userId, following, false);
    }

    public async Task<System.Collections.Generic.List<NetworkUserDto>> GetPendingReceivedRequestsAsync(int currentUserId)
    {
        var requests = await _userRepo.GetPendingReceivedConnectionRequestsAsync(currentUserId);
        var result = new System.Collections.Generic.List<NetworkUserDto>();
        foreach (var req in requests)
        {
            var sender = req.Sender;
            var mutualCount = await _userRepo.GetMutualConnectionsCountAsync(currentUserId, sender.UserId);
            var mutuals = await _userRepo.GetMutualConnectionsAsync(currentUserId, sender.UserId);
            var avatars = mutuals.Where(m => !string.IsNullOrEmpty(m.ProfilePhotoUrl)).Select(m => m.ProfilePhotoUrl!).Take(3).ToList();

            result.Add(new NetworkUserDto
            {
                Id = sender.UserId,
                Name = sender.FullName,
                Role = sender.Roles.FirstOrDefault()?.RoleName ?? "Employee",
                Department = sender.Department?.Name ?? "General",
                Avatar = sender.ProfilePhotoUrl,
                MutualConnections = mutualCount,
                MutualConnectionAvatars = avatars,
                IsFollowing = false,
                IsSuggested = false,
                Reason = mutualCount > 0 ? $"{mutualCount} Mutual Connections" : "Sent you a connection request",
                ConnectionStatus = "PendingReceived",
                RequestId = req.RequestId
            });
        }
        return result;
    }

    public async Task<System.Collections.Generic.List<NetworkUserDto>> GetPendingSentRequestsAsync(int currentUserId)
    {
        var requests = await _userRepo.GetPendingSentConnectionRequestsAsync(currentUserId);
        var result = new System.Collections.Generic.List<NetworkUserDto>();
        foreach (var req in requests)
        {
            var receiver = req.Receiver;
            var mutualCount = await _userRepo.GetMutualConnectionsCountAsync(currentUserId, receiver.UserId);
            var mutuals = await _userRepo.GetMutualConnectionsAsync(currentUserId, receiver.UserId);
            var avatars = mutuals.Where(m => !string.IsNullOrEmpty(m.ProfilePhotoUrl)).Select(m => m.ProfilePhotoUrl!).Take(3).ToList();

            result.Add(new NetworkUserDto
            {
                Id = receiver.UserId,
                Name = receiver.FullName,
                Role = receiver.Roles.FirstOrDefault()?.RoleName ?? "Employee",
                Department = receiver.Department?.Name ?? "General",
                Avatar = receiver.ProfilePhotoUrl,
                MutualConnections = mutualCount,
                MutualConnectionAvatars = avatars,
                IsFollowing = false,
                IsSuggested = false,
                Reason = mutualCount > 0 ? $"{mutualCount} Mutual Connections" : "Request pending",
                ConnectionStatus = "PendingSent",
                RequestId = req.RequestId
            });
        }
        return result;
    }

    public async Task<System.Collections.Generic.List<NetworkUserDto>> GetConnectionsAsync(int currentUserId, int targetUserId)
    {
        var connections = await _userRepo.GetConnectionsAsync(targetUserId);
        return await MapToNetworkUsersAsync(currentUserId, connections, false);
    }

    private async Task<System.Collections.Generic.List<NetworkUserDto>> MapToNetworkUsersAsync(int currentUserId, System.Collections.Generic.List<Models.User> users, bool isSuggested)
    {
        var result = new System.Collections.Generic.List<NetworkUserDto>();
        foreach (var user in users)
        {
            if (user.UserId == currentUserId)
            {
                result.Add(new NetworkUserDto
                {
                    Id = user.UserId,
                    Name = user.FullName,
                    Role = user.Roles.FirstOrDefault()?.RoleName ?? "Employee",
                    Department = user.Department?.Name ?? "General",
                    Avatar = user.ProfilePhotoUrl,
                    ConnectionStatus = "Self"
                });
                continue;
            }

            var mutuals = await _userRepo.GetMutualConnectionsAsync(currentUserId, user.UserId);
            var mutualCount = mutuals.Count;
            var avatars = mutuals.Where(m => !string.IsNullOrEmpty(m.ProfilePhotoUrl)).Select(m => m.ProfilePhotoUrl!).Take(3).ToList();

            var commonCommunities = await _db.CommunityMembers
                .Where(c => c.UserId == currentUserId || c.UserId == user.UserId)
                .GroupBy(c => c.CommunityId)
                .CountAsync(g => g.Count() > 1);

            var isFollowing = await _userRepo.IsFollowingAsync(currentUserId, user.UserId);

            var connectionStatus = "NotConnected";
            int? requestId = null;

            if (isFollowing)
            {
                connectionStatus = "Connected";
            }

            var connectionRequest = await _userRepo.GetConnectionRequestAsync(currentUserId, user.UserId);
            var reverseRequest = await _userRepo.GetConnectionRequestAsync(user.UserId, currentUserId);

            if (connectionRequest != null && connectionRequest.Status == "Pending")
            {
                connectionStatus = "PendingSent";
                requestId = connectionRequest.RequestId;
            }
            else if (reverseRequest != null && reverseRequest.Status == "Pending")
            {
                connectionStatus = "PendingReceived";
                requestId = reverseRequest.RequestId;
            }

            var reason = mutualCount > 0 ? $"{mutualCount} Mutual Connections" : 
                         (commonCommunities > 0 ? $"{commonCommunities} Common Communities" : (isSuggested ? "Suggested for you" : ""));

            result.Add(new NetworkUserDto
            {
                Id = user.UserId,
                Name = user.FullName,
                Role = user.Roles.FirstOrDefault()?.RoleName ?? "Employee",
                Department = user.Department?.Name ?? "General",
                Avatar = user.ProfilePhotoUrl,
                MutualConnections = mutualCount,
                MutualConnectionAvatars = avatars,
                CommonCommunities = commonCommunities,
                IsFollowing = isFollowing,
                IsSuggested = isSuggested,
                Reason = reason,
                ConnectionStatus = connectionStatus,
                RequestId = requestId
            });
        }
        return result;
    }

    public async Task SendConnectionRequestAsync(int senderId, int receiverId)
    {
        if (senderId == receiverId) throw new BadRequestException("Cannot connect with yourself.");

        var existingDirect = await _userRepo.GetConnectionRequestAsync(senderId, receiverId);
        var existingReverse = await _userRepo.GetConnectionRequestAsync(receiverId, senderId);

        if (existingDirect != null)
        {
            if (existingDirect.Status == "Pending") throw new BadRequestException("Connection request already pending.");
            if (existingDirect.Status == "Connected" || existingDirect.Status == "Accepted") throw new BadRequestException("Already connected.");
        }

        // Cross-request auto-merging: If receiver already sent a request to sender, accept it automatically!
        if (existingReverse != null && existingReverse.Status == "Pending")
        {
            existingReverse.Status = "Connected";
            await _userRepo.UpdateConnectionRequestAsync(existingReverse);
            await _userRepo.AddBidirectionalFollowAsync(senderId, receiverId);

            var senderProfile = await _userRepo.GetProfileByIdAsync(senderId);
            var receiverProfile = await _userRepo.GetProfileByIdAsync(receiverId);

            await _notificationService.PublishAsync(
                recipientUserId: receiverId,
                eventType: NotificationTypes.ConnectionRequest,
                message: $"{senderProfile?.FullName ?? "Someone"} accepted your connection request.",
                relatedContentType: NotificationContentTypes.User,
                relatedContentId: senderId
            );

            await _notificationService.PublishAsync(
                recipientUserId: senderId,
                eventType: NotificationTypes.ConnectionRequest,
                message: $"You are now connected with {receiverProfile?.FullName ?? "Someone"}.",
                relatedContentType: NotificationContentTypes.User,
                relatedContentId: receiverId
            );

            return;
        }

        var isFollowing = await _userRepo.IsFollowingAsync(senderId, receiverId);
        if (isFollowing) throw new BadRequestException("Already connected.");

        var request = new ConnectionRequest
        {
            SenderId = senderId,
            ReceiverId = receiverId,
            Status = "Pending"
        };
        await _userRepo.AddConnectionRequestAsync(request);

        var sender = await _userRepo.GetProfileByIdAsync(senderId);
        var senderName = sender?.FullName ?? "Someone";

        // Notify Receiver
        await _notificationService.PublishAsync(
            recipientUserId: receiverId,
            eventType: NotificationTypes.ConnectionRequest,
            message: $"{senderName} sent you a connection request.",
            relatedContentType: NotificationContentTypes.User,
            relatedContentId: senderId
        );
    }

    public async Task AcceptConnectionRequestAsync(int userId, int requestId)
    {
        var request = await _db.ConnectionRequests.FirstOrDefaultAsync(cr => cr.RequestId == requestId);
        if (request == null)
        {
            // Fallback: try lookup where requestId is senderId and receiver is current userId
            request = await _userRepo.GetConnectionRequestAsync(requestId, userId);
        }

        if (request == null)
        {
            // Check if they are already connected or following each other
            var isAlreadyConnected = await _userRepo.IsFollowingAsync(userId, requestId);
            if (isAlreadyConnected)
            {
                return; // Idempotent success
            }
            throw new NotFoundException("Connection request not found.");
        }

        if (request.ReceiverId != userId)
        {
            throw new ForbiddenException("You are not authorized to accept this connection request.");
        }

        if (request.Status.Equals("Connected", StringComparison.OrdinalIgnoreCase) || request.Status.Equals("ACCEPTED", StringComparison.OrdinalIgnoreCase))
        {
            return; // Idempotent success: already connected
        }

        request.Status = "Connected";
        await _userRepo.UpdateConnectionRequestAsync(request);

        // Create bi-directional follow relationship
        await _userRepo.AddBidirectionalFollowAsync(request.SenderId, request.ReceiverId);

        var acceptor = await _userRepo.GetProfileByIdAsync(userId);
        var acceptorName = acceptor?.FullName ?? "Someone";

        // Notify Sender
        await _notificationService.PublishAsync(
            recipientUserId: request.SenderId,
            eventType: NotificationTypes.ConnectionRequest,
            message: $"{acceptorName} accepted your connection request.",
            relatedContentType: NotificationContentTypes.User,
            relatedContentId: userId
        );

        // Dismiss the notification for the receiver
        var pendingNotifications = await _db.Notifications
            .Where(n => n.UserId == userId && n.EventType == NotificationTypes.ConnectionRequest && n.RelatedContentType == NotificationContentTypes.User && n.RelatedContentId == request.SenderId)
            .ToListAsync();
        foreach (var pendingNotification in pendingNotifications)
        {
            pendingNotification.IsRead = true;
        }
        if (pendingNotifications.Any())
        {
            await _db.SaveChangesAsync();
        }
    }

    public async Task RejectConnectionRequestAsync(int userId, int requestId)
    {
        var request = await _db.ConnectionRequests.FirstOrDefaultAsync(cr => cr.RequestId == requestId);
        if (request == null)
        {
            request = await _userRepo.GetConnectionRequestAsync(requestId, userId);
        }

        if (request == null)
        {
            return; // Idempotent success: request already removed or processed
        }

        if (request.ReceiverId != userId)
        {
            throw new ForbiddenException("You are not authorized to reject this connection request.");
        }

        await _userRepo.RemoveConnectionRequestAsync(request);

        // Dismiss the notification for the receiver
        var pendingNotifications = await _db.Notifications
            .Where(n => n.UserId == userId && n.EventType == NotificationTypes.ConnectionRequest && n.RelatedContentType == NotificationContentTypes.User && n.RelatedContentId == request.SenderId)
            .ToListAsync();
        foreach (var pendingNotification in pendingNotifications)
        {
            pendingNotification.IsRead = true;
        }
        if (pendingNotifications.Any())
        {
            await _db.SaveChangesAsync();
        }
    }

    public async Task CancelConnectionRequestAsync(int currentUserId, int targetUserId)
    {
        var request = await _userRepo.GetConnectionRequestAsync(currentUserId, targetUserId);
        if (request != null)
        {
            await _userRepo.RemoveConnectionRequestAsync(request);
        }
    }

    public async Task RemoveConnectionAsync(int currentUserId, int targetUserId)
    {
        var direct = await _userRepo.GetConnectionRequestAsync(currentUserId, targetUserId);
        if (direct != null) await _userRepo.RemoveConnectionRequestAsync(direct);

        var reverse = await _userRepo.GetConnectionRequestAsync(targetUserId, currentUserId);
        if (reverse != null) await _userRepo.RemoveConnectionRequestAsync(reverse);

        await _userRepo.RemoveBidirectionalFollowAsync(currentUserId, targetUserId);
    }
}
