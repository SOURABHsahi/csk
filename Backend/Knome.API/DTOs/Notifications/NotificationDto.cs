using System;

namespace Knome.API.DTOs.Notifications;

public class NotificationDto
{
    public long NotificationId { get; set; }
    public int UserId { get; set; }
    public string EventType { get; set; } = null!;
    public string Message { get; set; } = null!;
    public string? RelatedContentType { get; set; }
    public long? RelatedContentId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedDate { get; set; }
}