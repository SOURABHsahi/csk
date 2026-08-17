using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Knome.API.DTOs.Notifications;
using Knome.API.Hubs;
using Knome.API.Interfaces;
using Knome.API.Models;
using Microsoft.AspNetCore.SignalR;

namespace Knome.API.Services;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _repository;
    private readonly IUserRepository _userRepository;
    private readonly IMapper _mapper;
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationService(
        INotificationRepository repository,
        IUserRepository userRepository,
        IMapper mapper,
        IHubContext<NotificationHub> hubContext)
    {
        _repository = repository;
        _userRepository = userRepository;
        _mapper = mapper;
        _hubContext = hubContext;
    }

    public async Task<NotificationDto?> PublishAsync(
        int recipientUserId,
        string eventType,
        string message,
        string? relatedContentType = null,
        long? relatedContentId = null)
    {
        try
        {
            var eligible = await _repository.GetEligibleRecipientIdsAsync(eventType, new List<int> { recipientUserId });
            if (eligible.Count == 0)
                return null;

            var notification = new Notification
            {
                UserId = recipientUserId,
                EventType = eventType,
                Message = message,
                RelatedContentType = relatedContentType,
                RelatedContentId = relatedContentId,
                IsRead = false,
                CreatedDate = DateTime.UtcNow
            };

            var saved = await _repository.AddAsync(notification);
            var dto = _mapper.Map<NotificationDto>(saved);
            await EnrichNotificationDtoAsync(dto);

            // Real-time broadcast to user group
            await _hubContext.Clients.Group($"User_{recipientUserId}").SendAsync("ReceiveNotification", dto);

            return dto;
        }
        catch
        {
            return null;
        }
    }

    public async Task PublishBroadcastAsync(
        string eventType,
        string message,
        string? relatedContentType,
        long? relatedContentId,
        IEnumerable<int> candidateUserIds)
    {
        var candidates = candidateUserIds.ToList();
        var eligible = await _repository.GetEligibleRecipientIdsAsync(eventType, candidates);
        if (eligible.Count == 0)
            return;

        var now = DateTime.UtcNow;
        var notifications = eligible.Select(userId => new Notification
        {
            UserId = userId,
            EventType = eventType,
            Message = message,
            RelatedContentType = relatedContentType,
            RelatedContentId = relatedContentId,
            IsRead = false,
            CreatedDate = now
        }).ToList();

        if (notifications.Count > 0)
        {
            await _repository.AddRangeAsync(notifications);
            var dtos = _mapper.Map<List<NotificationDto>>(notifications);
            await EnrichNotificationDtosAsync(dtos);

            // Broadcast in real-time
            foreach (var dto in dtos)
            {
                await _hubContext.Clients.Group($"User_{dto.UserId}").SendAsync("ReceiveNotification", dto);
            }
        }
    }

    public async Task<List<NotificationDto>> GetForUserAsync(int userId, bool unreadOnly = false, int pageNumber = 1, int pageSize = 20)
    {
        var skip = (pageNumber < 1 ? 1 : pageNumber - 1) * (pageSize < 1 ? 20 : pageSize);
        var take = pageSize < 1 ? 20 : pageSize;

        var items = await _repository.GetForUserAsync(userId, unreadOnly, skip, take);
        var dtos = _mapper.Map<List<NotificationDto>>(items);
        await EnrichNotificationDtosAsync(dtos);
        return dtos;
    }

    public async Task<int> GetUnreadCountAsync(int userId)
    {
        return await _repository.CountForUserAsync(userId, unreadOnly: true);
    }

    public async Task<bool> MarkAsReadAsync(long notificationId, int userId)
    {
        var notification = await _repository.GetByIdAsync(notificationId);
        if (notification is null || notification.UserId != userId)
            return false;

        await _repository.MarkAsReadAsync(notificationId);
        return true;
    }

    public async Task MarkAllAsReadAsync(int userId)
    {
        await _repository.MarkAllAsReadAsync(userId);
    }

    public async Task<bool> DeleteNotificationAsync(long notificationId, int userId)
    {
        var notification = await _repository.GetByIdAsync(notificationId);
        if (notification is null || notification.UserId != userId)
            return false;

        await _repository.DeleteAsync(notificationId);
        return true;
    }

    public async Task<NotificationDto?> CreateNotificationAsync(CreateNotificationDto dto, int senderUserId)
    {
        return await PublishAsync(
            recipientUserId: dto.RecipientUserId,
            eventType: dto.NotificationType,
            message: dto.Message,
            relatedContentType: dto.RelatedContentType ?? Constants.NotificationContentTypes.User,
            relatedContentId: dto.ReferenceId ?? senderUserId
        );
    }

    public async Task<List<NotificationPreferenceDto>> GetPreferencesAsync(int userId)
    {
        var prefs = await _repository.GetPreferencesAsync(userId);
        return _mapper.Map<List<NotificationPreferenceDto>>(prefs);
    }

    public async Task UpdatePreferencesAsync(int userId, List<UpdateNotificationPreferenceDto> preferences)
    {
        var entities = preferences.Select(p => new NotificationPreference
        {
            UserId = userId,
            EventType = p.EventType,
            BellEnabled = p.BellEnabled,
            EmailEnabled = p.EmailEnabled
        }).ToList();

        await _repository.ReplacePreferencesAsync(userId, entities);
    }

    private async Task EnrichNotificationDtoAsync(NotificationDto dto)
    {
        dto.Title = dto.EventType switch
        {
            Constants.NotificationTypes.Follower => "New Follower",
            Constants.NotificationTypes.ConnectionRequest => "Follow Request",
            Constants.NotificationTypes.Comment => "New Comment",
            Constants.NotificationTypes.CommunityJoin => "Community Access Approved",
            Constants.NotificationTypes.CommunityInvite => "Community Invitation",
            Constants.NotificationTypes.HrAnnouncement => "HR Announcement",
            Constants.NotificationTypes.Job => "New Job Posting",
            Constants.NotificationTypes.Badge => "Karma Badge Earned",
            Constants.NotificationTypes.Mention => "Mentioned You",
            Constants.NotificationTypes.Reaction => "New Reaction",
            Constants.NotificationTypes.Share => "Content Shared",
            _ => dto.EventType ?? "Notification"
        };

        if (dto.RelatedContentType == Constants.NotificationContentTypes.User && dto.RelatedContentId.HasValue)
        {
            var senderId = (int)dto.RelatedContentId.Value;
            dto.SenderUserId = senderId;
            var sender = await _userRepository.GetProfileByIdAsync(senderId);
            if (sender != null)
            {
                dto.SenderName = sender.FullName;
                dto.SenderAvatar = sender.ProfilePhotoUrl;
            }
        }

        if (string.IsNullOrEmpty(dto.SenderName) && !string.IsNullOrEmpty(dto.Message))
        {
            var match = System.Text.RegularExpressions.Regex.Match(dto.Message, @"^(.+?)\s+(shared|invited|sent|commented|liked|reacted|posted|mentioned)\b", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (match.Success && !string.IsNullOrWhiteSpace(match.Groups[1].Value))
            {
                dto.SenderName = match.Groups[1].Value.Trim();
            }
        }

        if (!string.IsNullOrEmpty(dto.RelatedContentType) && dto.RelatedContentId.HasValue)
        {
            var type = dto.RelatedContentType.ToLower();
            var id = dto.RelatedContentId.Value;

            dto.TargetUrl = type switch
            {
                "post" => $"/posts?id={id}",
                "article" => $"/article-view?id={id}",
                "video" => $"/videos?id={id}",
                "podcast" => $"/podcasts?id={id}",
                "community" => $"/community/view?id={id}",
                "user" => $"/profile?id={id}",
                "job" => $"/jobs?id={id}",
                "badge" => $"/karma-history",
                _ => null
            };
        }
    }

    private async Task EnrichNotificationDtosAsync(IEnumerable<NotificationDto> dtos)
    {
        foreach (var dto in dtos)
        {
            await EnrichNotificationDtoAsync(dto);
        }
    }
}