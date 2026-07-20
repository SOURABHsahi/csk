using System.Collections.Generic;

namespace Knome.API.DTOs.Posts;

public class UpdatePostDto
{
    public string ContentText { get; set; } = string.Empty;
    public string AudienceType { get; set; } = "Everyone";
    public string Status { get; set; } = "Published";
    public List<string> AttachmentUrls { get; set; } = new();
    public List<string> AttachmentTypes { get; set; } = new();
    public List<int> MentionedUserIds { get; set; } = new();
}
