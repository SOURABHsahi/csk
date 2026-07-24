using System.ComponentModel.DataAnnotations;

namespace Knome.API.DTOs.Notifications;

public class BroadcastNotificationDto
{
    [Required]
    [MaxLength(400)]
    public string Message { get; set; } = null!;

    [MaxLength(20)]
    public string? RelatedContentType { get; set; }

    public long? RelatedContentId { get; set; }
}
