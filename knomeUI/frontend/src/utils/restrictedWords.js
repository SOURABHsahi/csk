export const RESTRICTED_WORDS = [
    // PII & Sensitive Credentials
    "aadhaar", "access token", "api key", "apikey", "bank account", "client secret",
    "connection string", "credit card", "cvv", "database password", "jwt token",
    "otp", "pan card", "passport", "password", "private key", "refresh token",
    "secret key",

    // Abusive / Profanities (Hindi / Hinglish / English)
    "abuse", "abusive", "asshole", "bastard", "bc", "behenchod", "bhenchod",
    "bhosadike", "bhosdike", "bitch", "bkl", "bsdk", "choot", "chutiya",
    "chutiye", "cunt", "damn", "dick", "fool", "fuck", "fucking", "gaali",
    "gaand", "gandu", "haraami", "harami", "harassment", "hate", "hell",
    "idiot", "kameena", "kamina", "kaminey", "lauda", "laude", "lodu",
    "loser", "lund", "madarchod", "madharchod", "mc", "mkc", "moron",
    "motherfucker", "offensive", "piss", "pussy", "raand", "randi", "saala",
    "saale", "sala", "sale", "sexist", "shit", "slut", "stupid", "suar",
    "tatte", "whore",

    // Threats & Harassment
    "bomb", "bullying", "jaan se maar dunga", "khatam kar dunga", "kill",
    "maar dalunga", "murder", "terrorist", "tujhe dekh lunga", "violence",
    "weapon",

    // Spam / Phishing / Scams
    "betting", "buy now", "casino", "cheat", "click here", "earn money",
    "fraud", "free me paise", "free money", "free recharge", "gambling",
    "ghar baithe kamao", "hack", "hacker", "hacking", "jaldi click karo",
    "lottery", "lottery jeeto", "malware", "paisa kamao", "paytm cash",
    "phishing", "piracy", "ransomware", "scam", "virus",

    // NSFW / Adult / Inappropriate
    "explicit", "hot video", "mallu bhabhi", "nude", "nude bhejo", "porn",
    "pornography", "sex chat", "sexual",

    // Corporate Governance & Confidentiality
    "classified", "confidential", "internal only", "nda", "proprietary",
    "restricted", "salary"
];

export const checkRestrictedContent = (text) => {
    if (!text) return null;

    // Strip HTML tags for clean text scanning if HTML content is passed
    const cleanText = typeof text === 'string' ? text.replace(/<[^>]*>/g, ' ') : String(text);

    for (const kw of RESTRICTED_WORDS) {
        const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match whole word or exact multi-word phrase using word boundaries
        const regex = new RegExp(`\\b${escapedKw}\\b`, 'i');
        if (regex.test(cleanText)) {
            return kw;
        }
    }

    return null;
};

export const getRestrictedWarningMessage = (keyword) => {
    return `Security Alert: Your content contains the restricted term ("${keyword}"). Content containing abusive words, spam, threats, or sensitive data cannot be posted.`;
};
