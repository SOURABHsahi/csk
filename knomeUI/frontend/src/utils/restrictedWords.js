export const RESTRICTED_WORDS = [
    "aadhaar", "abuse", "abusive", "access token", "api key", "apikey", 
    "asshole", "bank account", "bastard", "bhenchod", "bhosdike", "bitch", 
    "betting", "bomb", "bullying", "buy now", "casino", "cheat", "chutiya", 
    "classified", "click here", "client secret", "confidential", "connection string", 
    "crack", "credit card", "cunt", "cvv", "damn", "database password", 
    "dick", "earn money", "explicit", "fool", "fraud", "free money", "fuck", "fucking", 
    "gaali", "gambling", "gandu", "hack", "hacker", "hacking", "harami", "harassment", 
    "hate", "hell", "idiot", "internal only", "jwt token", "kameena", "kamina", 
    "kill", "laude", "lodu", "loser", "lottery", "lund", "madarchod", "madharchod", 
    "malware", "moron", "motherfucker", "murder", "nda", "nude", "offensive", "otp", 
    "pan card", "passport", "password", "phishing", "piss", "piracy", "porn", 
    "pornography", "private key", "proprietary", "pussy", "racist", "randi", 
    "ransomware", "refresh token", "restricted", "saala", "sala", "salary", "scam", 
    "secret key", "sexist", "sexual", "shit", "slut", "stupid", "suar", "terrorist", 
    "tatte", "violence", "virus", "weapon", "whore"
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
