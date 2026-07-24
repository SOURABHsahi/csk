export const RESTRICTED_WORDS = [
    "aadhaar", "abuse", "abusive", "access token", "api key", "apikey", 
    "bank account", "betting", "bomb", "bullying", "buy now", "casino", 
    "cheat", "classified", "click here", "client secret", "confidential", 
    "connection string", "crack", "credit card", "cvv", "damn", "database password", 
    "earn money", "explicit", "fool", "fraud", "free money", "gambling", 
    "hack", "hacker", "hacking", "harassment", "hate", "hell", "idiot", 
    "internal only", "jwt token", "kill", "loser", "lottery", "malware", 
    "moron", "murder", "nda", "nude", "offensive", "otp", "pan card", 
    "passport", "password", "phishing", "piracy", "porn", "pornography", 
    "private key", "proprietary", "racist", "ransomware", "refresh token", 
    "restricted", "salary", "scam", "secret key", "sexist", "sexual", 
    "stupid", "terrorist", "violence", "virus", "weapon"
];

export const checkRestrictedContent = (text) => {
    if (!text) return null;
    
    for (const kw of RESTRICTED_WORDS) {
        const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match whole word or exact multi-word phrase using word boundaries
        const regex = new RegExp(`\\b${escapedKw}\\b`, 'i');
        if (regex.test(text)) {
            return kw;
        }
    }
    
    return null;
};
