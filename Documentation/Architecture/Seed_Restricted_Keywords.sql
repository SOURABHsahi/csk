-- Seed Restricted Keywords into Knome DB (FR-SM-07)
USE [Knome];
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RestrictedKeywords')
BEGIN
    CREATE TABLE [dbo].[RestrictedKeywords] (
        [KeywordId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Keyword] NVARCHAR(100) NOT NULL UNIQUE,
        [Category] NVARCHAR(50) NOT NULL DEFAULT 'General',
        [CreatedDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
END
GO

MERGE INTO [dbo].[RestrictedKeywords] AS Target
USING (VALUES 
    ('aadhaar'), ('abuse'), ('abusive'), ('access token'), ('api key'), ('apikey'), 
    ('bank account'), ('betting'), ('bomb'), ('bullying'), ('buy now'), ('casino'), 
    ('cheat'), ('classified'), ('click here'), ('client secret'), ('confidential'), 
    ('connection string'), ('crack'), ('credit card'), ('cvv'), ('damn'), ('database password'), 
    ('earn money'), ('explicit'), ('fool'), ('fraud'), ('free money'), ('gambling'), 
    ('hack'), ('hacker'), ('hacking'), ('harassment'), ('hate'), ('hell'), ('idiot'), 
    ('internal only'), ('jwt token'), ('kill'), ('loser'), ('lottery'), ('malware'), 
    ('moron'), ('murder'), ('nda'), ('nude'), ('offensive'), ('otp'), ('pan card'), 
    ('passport'), ('password'), ('phishing'), ('piracy'), ('porn'), ('pornography'), 
    ('private key'), ('proprietary'), ('racist'), ('ransomware'), ('refresh token'), 
    ('restricted'), ('salary'), ('scam'), ('secret key'), ('sexist'), ('sexual'), 
    ('stupid'), ('terrorist'), ('violence'), ('virus'), ('weapon')
) AS Source ([Keyword])
ON Target.[Keyword] = Source.[Keyword]
WHEN NOT MATCHED THEN
    INSERT ([Keyword], [Category], [CreatedDate])
    VALUES (Source.[Keyword], 'Security', GETUTCDATE());
GO
