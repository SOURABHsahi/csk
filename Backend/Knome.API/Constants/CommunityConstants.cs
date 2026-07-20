namespace Knome.API.Constants;

public static class CommunityTypes
{
    public const string Public = "Public";
    public const string Private = "Private";
    public const string Default = "Default";

    public static readonly string[] All = { Public, Private, Default };

    public static bool IsValid(string? type)
    {
        if (string.IsNullOrWhiteSpace(type)) return false;
        return type == Public || type == Private || type == Default;
    }
}

public static class CommunityMemberTypes
{
    public const string Subscriber = "Subscriber";
    public const string Contributor = "Contributor";
    public const string Moderator = "Moderator";

    public static readonly string[] All = { Subscriber, Contributor, Moderator };
}

public static class CommunityMemberStatuses
{
    public const string Approved = "Approved";
    public const string Pending = "Pending";
    public const string Rejected = "Rejected";
    public const string Banned = "Banned";

    public static readonly string[] All = { Approved, Pending, Rejected, Banned };

    public static bool IsValidDecision(string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return false;
        return status == Approved || status == Rejected || status == Banned;
    }
}
