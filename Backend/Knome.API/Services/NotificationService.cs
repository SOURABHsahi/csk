using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Knome.API.DTOs.Notifications;
using Knome.API.Interfaces;
using Knome.API.Models;

namespace Knome.API.Services;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _repository;
    private readonly IMapper _mapper;

    public NotificationService(INotificationRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<NotificationDto?> PublishAsync(
        int recipientUserId,
        string eventType,
        string message,
        string? relatedContentType = null,
        long? relatedContentId = null)
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
        return _mapper.Map<NotificationDto>(saved);
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
            await _repository.AddRangeAsync(notifications);
    }

    public async Task<List<NotificationDto>> GetForUserAsync(int userId, bool unreadOnly = false, int pageNumber = 1, int pageSize = 20)
    {
        var skip = (pageNumber < 1 ? 1 : pageNumber - 1) * (pageSize < 1 ? 20 : pageSize);
        var take = pageSize < 1 ? 20 : pageSize;

        var items = await _repository.GetForUserAsync(userId, unreadOnly, skip, take);
        return _mapper.Map<List<NotificationDto>>(items);
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
}