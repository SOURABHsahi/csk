namespace Knome.API.Constants;

public static class KarmaActivityTypes
{
    public const string CreatePost = "CreatePost";
    public const string CreateArticle = "CreateArticle";
    public const string CreateVideo = "CreateVideo";
    public const string CreatePodcast = "CreatePodcast";
    public const string AddComment = "AddComment";
    public const string ReceiveReaction = "ReceiveReaction";
    public const string ReceiveComment = "ReceiveComment";
    public const string ManualAward = "ManualAward";
    public const string Other = "Other";
}

public static class KarmaPoints
{
    public const int CreatePostPoints = 5;
    public const int CreateArticlePoints = 15;
    public const int CreateVideoPoints = 10;
    public const int CreatePodcastPoints = 10;
    public const int AddCommentPoints = 3;
    public const int ReceiveReactionPoints = 2;
    public const int ReceiveCommentPoints = 5;
}

public static class BadgeLevels
{
    public const string Bronze = "Bronze";
    public const string Silver = "Silver";
    public const string Gold = "Gold";
    public const string Platinum = "Platinum";

    public static string ComputeBadge(int totalPoints)
    {
        if (totalPoints >= 1500) return Platinum;
        if (totalPoints >= 500) return Gold;
        if (totalPoints >= 100) return Silver;
        return Bronze;
    }

    /// <summary>Ordinal rank of a badge level (higher = better). Empty/unknown = 0.</summary>
    public static int Rank(string? level)
    {
        return level switch
        {
            Platinum => 4,
            Gold => 3,
            Silver => 2,
            Bronze => 1,
            _ => 0
        };
    }
}
