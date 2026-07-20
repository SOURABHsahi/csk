using System;
using Knome.API.DTOs.Interactions;

namespace Knome.API.DTOs.Feed;

public class FeedItemDto
{
    public string ContentType { get; set; } = null!; // Post, Article, Video, Podcast
    public long ContentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string TextSummary { get; set; } = string.Empty;
    public string? AttachmentUrl { get; set; }
    
    public int AuthorUserId { get; set; }
    public string AuthorEmployeeId { get; set; } = string.Empty;
    public string AuthorFullName { get; set; } = string.Empty;
    public string? AuthorDesignation { get; set; }
    public string? AuthorProfilePhotoUrl { get; set; }

    public DateTime PublishedDate { get; set; }
    public string AudienceType { get; set; } = "Everyone";

    public ContentSummaryDto? EngagementSummary { get; set; }
    public decimal HotScore { get; set; }
}
