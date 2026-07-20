using System.Collections.Generic;
using System.Threading.Tasks;
using Knome.API.Models;

namespace Knome.API.Interfaces;

public interface INotificationRepository
{
    Task<Notification> AddAsync(Notification notification);
    Task AddRangeAsync(IEnumerable<Notification> notifications);
    Task<Notification?> GetByIdAsync(long notificationId);
    Task<List<Notification>> GetForUserAsync(int userId, bool unreadOnly, int skip, int take);
    Task<int> CountForUserAsync(int userId, bool unreadOnly);
    Task MarkAsReadAsync(long notificationId);
    Task MarkAllAsReadAsync(int userId);
    Task<List<NotificationPreference>> GetPreferencesAsync(int userId);
    Task ReplacePreferencesAsync(int userId, List<NotificationPreference> preferences);
    Task<List<int>> GetEligibleRecipientIdsAsync(string eventType, List<int> candidateUserIds);
}