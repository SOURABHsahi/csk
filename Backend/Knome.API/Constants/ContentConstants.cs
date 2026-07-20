namespace Knome.API.Constants;

public static class ContentTypes
{
    public const string Post = "Post";
    public const string Article = "Article";
    public const string Video = "Video";
    public const string Podcast = "Podcast";

    public static readonly string[] All = { Post, Article, Video, Podcast };

    public static bool IsValid(string? contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType)) return false;
        return contentType == Post || contentType == Article || contentType == Video || contentType == Podcast;
    }
}

public static class ReactionTypes
{
    public const string Like = "Like";
    public const string Celebrate = "Celebrate";
    public const string Support = "Support";
    public const string Heart = "Heart";

    public static readonly string[] All = { Like, Celebrate, Support, Heart };

    public static bool IsValid(string? reactionType)
    {
        if (string.IsNullOrWhiteSpace(reactionType)) return false;
        return reactionType == Like || reactionType == Celebrate || reactionType == Support || reactionType == Heart;
    }
}

public static class SharedToTypes
{
    public const string Timeline = "Timeline";
    public const string Community = "Community";
    public const string User = "User";
    public const string External = "External";

    public static readonly string[] All = { Timeline, Community, User, External };

    public static bool IsValid(string? sharedToType)
    {
        if (string.IsNullOrWhiteSpace(sharedToType)) return false;
        return sharedToType == Timeline || sharedToType == Community || sharedToType == User || sharedToType == External;
    }
}

public static class ReportStatuses
{
    public const string Pending = "Pending";
    public const string UnderReview = "Under Review";
    public const string Resolved = "Resolved";
    public const string Dismissed = "Dismissed";
}

public static class ReportReasonCodes
{
    public const string Spam = "Spam";
    public const string Harassment = "Harassment";
    public const string Inappropriate = "Inappropriate";
    public const string Copyright = "Copyright";
    public const string Other = "Other";

    public static readonly string[] All = { Spam, Harassment, Inappropriate, Copyright, Other };

    public static bool IsValid(string? reasonCode)
    {
        if (string.IsNullOrWhiteSpace(reasonCode)) return false;
        return reasonCode == Spam || reasonCode == Harassment || reasonCode == Inappropriate || reasonCode == Copyright || reasonCode == Other;
    }
}
