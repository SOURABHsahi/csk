# Knome EEP Portal — Project Status & Roadmap

**Current Version**: `v1.2.8` (Phase E Release Activities Completed — Backend Frozen for Frontend Handoff)  
**Architecture**: ASP.NET Core 9 Web API (`net9.0`) + Entity Framework Core (`Database-First`) + Repository & Service Pattern  
**Primary Requirements Reference**: Functional Requirements Document (`FRD v1.0`)

---

## Executive Summary

| Phase | Module | Status | Deliverables / Features | Verification |
| :--- | :--- | :---: | :--- | :--- |
| **Phase 1** | **Infrastructure & Core Architecture** | ✅ Completed | Generic `IRepository<T>`, `ApiResponse<T>` envelope, structured `ExceptionHandlingMiddleware`, clean DI extension layout (`AddInfrastructure`). | Built & verified (`dotnet build -nologo`). |
| **Phase 2** | **Authentication Foundation (`FR-DB-08`, `NFR-SEC-02`)** | ✅ Completed | Stateless JWT Bearer (`HS256`) authentication, BCrypt hash verification (`work factor 11`), Role capability matrix mapping (`Employee`, `Community Admin`, `HR Administrator`, `System Administrator`), `AuthController`. | Verified against live SQL Server DB via `scratch/VerifyAuth`. |
| **Phase 3** | **User Profile & Management (`FR-UP-01..06`, `FR-SM-04`)** | ✅ Completed | Employee self-service profile updates (`Bio`, `Skills`, `Interests`, `Photo upload`), Indian DPDP Act 2023 visibility masking (`BioVisibility`, `PhotosVisibility`), HR Admin management (`ChangeDepartment`, `ChangeRoles`, `Suspend/Activate`), `IUserRepository`, `IFileStorageService`, `UserController`. | Verified against live SQL Server DB via `scratch/VerifyUsers`. |
| **Phase 4** | **Content Foundation & Interaction Engine (`FR-CI-01..05`, `FR-SM-01..03`)** | ✅ Completed | Encapsulated 4 separate interaction entities (`Comments`, `Reactions`, `Shares`, `Bookmarks`), real-time URL/keyword screening (`BlockedUrls`), Hot Posts ranking formula (`FR-HP-01`), and moderation reporting (`ModerationReports`), `IContentInteractionService`, `InteractionController`. | Verified against live SQL Server DB via `scratch/VerifyInteractions`. |
| **Phase 5** | **Communities & Membership (`FR-CM-01..09`)** | ✅ Completed | Public, Private, and Default community spaces, join request workflows, member governance (`CommunityAdmins`), sole admin safeguards, 3-pinned posts limit (`FR-CM-06`), delegating feed engagement to `IContentInteractionService`, `ICommunityService`, `CommunityController`. | Verified against live SQL Server DB via `scratch/VerifyCommunities`. |
| **Phase 6** | **Post & Article Engines (`FR-PC-01..07`, `FR-AB-01..07`)** | ✅ Completed | Quick-share posts (`max 400 chars`, multi-media attachments, `@mentions` dictionary join `PostMentions`), deep-dive rich text blogging (`Articles`, `ArticleTags`), automatic version snapshots (`ArticleVersions`), read time estimation, view counts (`ViewCount + 1`), `IPostService`, `IArticleService`, `PostController`, `ArticleController`. | Verified against live SQL Server DB via `scratch/VerifyPostsArticles`. |
| **Phase 7** | **Media Channels (`FR-VC-01..06`, `FR-PD-01..05`)** | ✅ Completed | Video Channel (`MP4/MOV <= 500MB`, Stream/OneDrive embed, multi-tagging `VideoTags`, view counts `ViewCount + 1`) and Podcast Channel (`MP3/WAV <= 100MB`, series definitions `PodcastSeries` with episode counts), `IVideoService`, `IPodcastService`, `VideoController`, `PodcastController`. | Verified against live SQL Server DB via `scratch/VerifyMediaChannels`. |
| **Phase 8** | **Dashboard Feed & Gamification (`FR-DB-01..08`, `FR-KP-01..04`)** | ✅ Completed | Dashboard personalized feeds, Hot Posts ranking engine integration, Karma Points engine, threshold badges (`Bronze`, `Silver`, `Gold`, `Platinum`). | Verified against live SQL Server DB via `scratch/VerifyPhase8`. |
| **Phase 9** | **Global Search & Discovery Engine (`FR-SD-01..05`)** | ✅ Completed | Unified search across Users, Communities, Posts, Articles, Videos, Podcasts, and Jobs; filtering (date/category/department), tag & author search, relevance/date/popularity sorting, and per-user search history (`FR-SD-05`). | Verified against live SQL Server DB via `scratch/VerifyPhase9` (8/8 checks). |
| **Phase 10** | **Audit Trail & Governance (`FR-SM-05`, `FR-SM-04`)** | ✅ Completed | `AuditLog` model + repository/service, reusable `ISuspensionGuard`, audit read API (`GET /api/audit/logs`) gated to System Admins, and audit wiring into user suspend/activate governance actions. | Build + runtime DI verification (`scratch/VerifyDiResolvers`). |
| **Phase 11** | **Jobs & Notifications (`FR-JB-01..05`, `FR-NT-01..04`)** | ✅ Completed | Internal Job Posting Board (HR/System Admin CRUD, filtering by Department/Location/Skills/Expiry, auto-expire hosted service, broadcast bell notifications) and a **generic, event-driven Notification Engine** (`INotificationService.Publish/PublishBroadcast`) with per-event-type preferences and a notification centre (unread count, mark-as-read). | Build + runtime DI verification (`scratch/VerifyDiResolvers`). |
| **Phase 12** | **Notification Producers Completion & Final Hardening (`FR-NT-01`)** | ✅ Completed | Full producer trigger coverage across all interaction workflows, HR Admin broadcast endpoint (`POST /api/notifications/broadcast`), comprehensive FluentValidation rules, and 100% DI resolution across all 14 API Controllers and 12 modules. | Build + 100% DI resolution verified via `scratch/VerifyDiResolvers`. |
| **Defects** | **Defect Resolution Pass** | ✅ Completed | Patched local development HTTPS redirection regression, fixed unreachable suspension check in `AuthService.LoginAsync`, resolved unhandled `ForbiddenException` mapping in `ExceptionHandlingMiddleware` (HTTP 403), and fixed `JobRepository.UpdateAsync` to throw `NotFoundException` (HTTP 404) instead of `InvalidOperationException`. | Build + `VerifyDiResolvers` DI runtime check 100% PASS. |
| **Hardening** | **Production Hardening (Pass 1 - Pass 6)** | ✅ Completed | Enforced strict FK validity checks (`GBV-001`, `M-001/002`), global `ValidationFilter` for automatic DTO validation interception, comprehensive `MaximumLength` constraints across all 12 modules, and precise status codes/endpoints (`B7-001/002`, `B6-003/B8-001`, `201 Created` vs `200 OK`, `DELETE /api/communities`). | Build + `VerifyDiResolvers` DI verification 100% PASS. |
| **Phase A** | **Pre-Frontend Essential Fixes (`F-007`, `F-009..012`, `F-014..016`)** | ✅ Completed | Resolved API contract and endpoint correctness: `CreateJob` returns `201 Created` (`F-009`), role strings converted to constants (`F-010/011`), `AuditLogFilterDto` range validation (`F-012`), route constraints in `InteractionController` (`F-014`), pagination added to "my" lists (`F-015`), exact route template in `SearchController` (`F-016`), and scratch DI registration (`F-007`). | Build (0 warnings, 0 errors) + runtime DI verification (`scratch/VerifyDiResolvers`) 100% PASS. |
| **Phase B** | **Architecture Consistency (`F-013`, `F-020`, `F-028..031`)** | ✅ Completed | Created `KnomeControllerBase` with `GetCurrentUserId()` (`F-013`) and refactored all 14 controllers; refactored `UserService` and `CommunityService` to use repositories instead of direct `_db` access (`F-028`); replaced magic strings with `NotificationTypes.*` (`F-029/030`); renamed `_service` fields (`F-031`); added `ILogger` exception logging in `DeleteProfileImageAsync` (`F-020`). | Build (0 warnings, 0 errors) + runtime DI verification (`scratch/VerifyDiResolvers`) 100% PASS. |
| **Phase C** | **Performance & Hardening (`F-017`, `F-026`, `F-027`)** | ✅ Completed | Replaced N+1 notification broadcast insert loop with `AddRangeAsync` + single `SaveChangesAsync` (`F-017`); restricted `KarmaController.AwardKarma` authorization scope to `Roles.SystemAdmin` (`F-026`); verified `ChangeRoleDto` role names pre-validation (`F-027`). | Build --no-restore (0 warnings, 0 errors) + `VerifyDiResolvers` --no-build 100% PASS. |
| **Phase D** | **Security Hardening (`F-018`, `F-019`, `F-021..024`)** | ✅ Completed | Implemented environment-specific JWT secret override (`F-018`); added MIME/magic byte header validation to `SaveProfileImageAsync` (`F-019`); restricted `AllowedHosts` to explicit internal host names (`F-021`); registered `SecurityHeadersMiddleware` setting HSTS, CSP, X-Frame-Options, X-Content-Type-Options, etc. (`F-022`); applied `[EnableRateLimiting]` with `LoginRateLimiter` (`F-023`); created and registered `PiiScrubbingEnricher` for Serilog (`F-024`). | Build --no-restore (0 warnings, 0 errors) + `VerifyDiResolvers` --no-build 100% PASS. |
| **Phase E** | **Release Activities & Documentation Sync (`F-008`, `F-032`)** | ✅ Completed | Synchronized `Backend_Verification_Findings.md` with post-hardening state (`F-008`); corrected AutoMapper profile count in `Production_Readiness_Audit_Part1.md` (`F-032`); verified post-launch deferral of refresh tokens (`F-025`); finalized release notes and declared **Backend Freeze (`v1.2.8`)**. | All documentation synchronized; 0 build errors/warnings; 100% DI PASS (`VerifyDiResolvers`). |

---

## Intentionally Deferred External Integrations (Out of Scope)

The following items from the FRD depend on external enterprise systems under active development by external infrastructure teams. Per project architectural decisions, they are marked as **External Integration Pending** and do not contain dummy mocks or simulated placeholders:

1. **HRMS SSO Integration (`/api/auth/sso-login`)**: The API endpoint exists and preserves existing JWT/role claim extension points, but live external identity provider (Azure AD / HRMS OIDC token exchange) integration is pending external infrastructure delivery.
2. **Email Digest Engine (`FR-NT-02`)**: Daily and weekly unread notification digest aggregation via SMTP / background scheduler is deferred pending corporate SMTP server provisioning (`FRD INT-03`).
3. **HRMS-Triggered Synchronization Workflows**: Automatic daily HRMS employee department/role synchronization background jobs (`LastSyncedFromHrmsDate`) will be activated once the external HRMS REST/OData endpoints become available.

---

## Architectural Guarantees & Constraints Preserved

1. **Strict Database-First Compliance**: The 41 base EF Core entity classes in `Models/` and `KnomeDbContext.cs` are treated as read-only generated code (`scaffolded`). No entity properties or relationships are modified manually.
2. **Seamless `@Mentions` & Join Table Orchestration**: Mapped target users directly into EF Core's many-to-many navigation (`post.MentionedUsers`), allowing EF Core to manage `PostMentions` (`(PostId, MentionedUserId)`) cleanly without manual SQL operations.
3. **Automatic Version Audit Trail (`FR-AB-02`)**: `ArticleService.UpdateArticleAsync` intercepts every content modification (`article.ContentHtml != dto.ContentHtml`) and creates a permanent `ArticleVersion` snapshot recording editor identity (`EditedByUserId`) and exact timestamp (`EditedDate`).
4. **Media Size & Source Boundary Enforcement (`FR-VC-01`, `FR-PD-02`)**: Enforces exact business limits (`Video <= 500 MB`, `Podcast <= 100 MB`, valid source types `Stream`/`OneDrive`/`LocalUpload`) in both FluentValidation layers and business service checks (`VideoService`/`PodcastService`).
5. **Polymorphic Interaction Delegation**: `IPostService`, `IArticleService`, `IVideoService`, and `IPodcastService` all delegate real-time comment counts, reaction metrics, shares, and bookmarks directly to `IContentInteractionService.GetContentSummaryAsync(ContentTypes.Post/Article/Video/Podcast, id, currentUserId)` from Phase 4.
6. **Real-Time Security Screening (`FR-SM-01`)**: All posts, articles, videos, and podcasts undergo immediate text and URL/attachment evaluation against `BlockedUrls` and `RestrictedKeywords` prior to database persistence.
7. **Generic Event-Driven Notification Engine (Phase 11)**: `INotificationService` exposes `PublishAsync` / `PublishBroadcastAsync` keyed by opaque `NotificationTypes` categories. Producers (Jobs is the first) publish without modifying the notification core; per-event-type `NotificationPreference` (Bell/Email) gating is centralized in the engine. New modules (Communities, Mentions, Reactions, Badges, HR Announcements) integrate by calling the engine only.

---

## Quick Start & Verification

### Prerequisites
- Operating System: Windows
- SDK: .NET 9.0 SDK (`net9.0`)
- Database: Microsoft SQL Server (`LAPTOP-462`, database `Knome`)

### Build & Run API
```powershell
cd "d:\Knome Final\Backend\Knome.API"
dotnet build -nologo
dotnet run
```
Access Swagger UI at: `http://localhost:5095/swagger` (or navigating to `http://localhost:5095/` automatically redirects to `/swagger`)

### Run Live Database Verification Suites
```powershell
# Verify Authentication & JWT Token issuance
dotnet run --project "d:\Knome Final\scratch\VerifyAuth\VerifyAuth.csproj"

# Verify Phase 3 User Profile, DPDP Masking, and HR Admin Operations
dotnet run --project "d:\Knome Final\scratch\VerifyUsers\VerifyUsers.csproj"

# Verify Phase 4 Polymorphic Content Interactions, Security Checks & Moderation
dotnet run --project "d:\Knome Final\scratch\VerifyInteractions\VerifyInteractions.csproj"

# Verify Phase 5 Communities, Join Workflows, Sole Admin Safeguard, and Pinning
dotnet run --project "d:\Knome Final\scratch\VerifyCommunities\VerifyCommunities.csproj"

# Verify Phase 6 Quick-Share Posts (@Mentions, max 400 chars) & Technical Blogging (ArticleVersions, ViewCount)
dotnet run --project "d:\Knome Final\scratch\VerifyPostsArticles\VerifyPostsArticles.csproj"

# Verify Phase 7 Video Channel (<= 500 MB, VideoTags, ViewCount) & Podcast Channel (<= 100 MB, PodcastSeries)
dotnet run --project "d:\Knome Final\scratch\VerifyMediaChannels\VerifyMediaChannels.csproj"

# Verify Phase 9 Global Search & Discovery (unified search, filters, tags, author, history)
dotnet run --project "d:\Knome Final\Backend\Knome.API\scratch\VerifyPhase9\VerifyPhase9.csproj"
```

---

## Development Journal Index
- [01_Infrastructure.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/01_Infrastructure.md) — Phase 1: Core Infrastructure Setup
- [02_Authentication_Foundation.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/02_Authentication_Foundation.md) — Phase 2: Authentication Foundation & SSO Readiness
- [03_User_Profile_Management.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/03_User_Profile_Management.md) — Phase 3: User Profile & User Management
- [04_Content_Foundation_Architecture_Decision.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/04_Content_Foundation_Architecture_Decision.md) — Phase 4 ADR: Verification of 4 Separate Interaction Tables & Roadmap
- [04_Content_Foundation_Interaction_Engine.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/04_Content_Foundation_Interaction_Engine.md) — Phase 4: Content Foundation & Interaction Engine
- [05_Communities_Membership_Management.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/05_Communities_Membership_Management.md) — Phase 5: Communities & Membership Management
- [06_Post_Article_Engines.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/06_Post_Article_Engines.md) — Phase 6: Post & Article Engines
- [07_Media_Channels.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/07_Media_Channels.md) — Phase 7: Media Channels (Video & Podcast Channels)
- [08_Dashboard_Gamification.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/08_Dashboard_Gamification.md) — Phase 8: Dashboard Feed & Gamification Engine
- [09_Search_Discovery.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/09_Search_Discovery.md) — Phase 9: Global Search & Discovery Engine
- [10_Audit_Trail_Governance.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/10_Audit_Trail_Governance.md) — Phase 10: Audit Trail & Governance
- [11_Jobs_Notifications.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/11_Jobs_Notifications.md) — Phase 11: Jobs & Notifications (generic notification engine)
- [12_Notification_Producers_And_Final_Hardening.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/12_Notification_Producers_And_Final_Hardening.md) — Phase 12: Notification Producers Completion & Final Hardening
- [13_Code_Defect_Resolution_Pass.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/13_Code_Defect_Resolution_Pass.md) — Defect Resolution: Patched HTTPS redirection, AuthService suspension checks, global ForbiddenException mapper, and JobRepository errors
- [14_Production_Hardening_Pass.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/14_Production_Hardening_Pass.md) — Production Hardening Pass: Enforced strict FK validation, global ValidationFilter, and MaximumLength across DTOs
- [15_Phase_A_Pre_Frontend_Essential_Fixes.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/15_Phase_A_Pre_Frontend_Essential_Fixes.md) — Phase A: Pre-Frontend Essential Fixes (CreateJob 201 Created, Karma/Notification role constants, AuditLogFilterDto Range validation, InteractionController route constraints, My endpoints pagination, SearchController route template, Scratch DI registrations)
- [16_Phase_B_Architecture_Consistency.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/16_Phase_B_Architecture_Consistency.md) — Phase B: Architecture Consistency (KnomeControllerBase & claim consolidation F-013, Repository abstraction enforcement F-028, Notification magic string constants F-029/030, Controller field naming F-031, File storage exception logging F-020)
- [17_Phase_C_Performance_And_Hardening.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/17_Phase_C_Performance_And_Hardening.md) — Phase C: Performance & Hardening (Bulk AddRangeAsync notification broadcasts F-017, AwardKarma role restriction to SystemAdmin F-026, ChangeRoleDto role validation verification F-027)
- [18_Phase_D_Security_Hardening.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/18_Phase_D_Security_Hardening.md) — Phase D: Security Hardening (Environment JWT secret F-018, Magic byte validation F-019, AllowedHosts restriction F-021, SecurityHeadersMiddleware F-022, Login rate limiting F-023, PII scrubbing enricher F-024)
- [19_Phase_E_Release_And_Backend_Freeze.md](file:///d:/Knome%20Final/Documentation/Development%20Journal/19_Phase_E_Release_And_Backend_Freeze.md) — Phase E: Release Activities, Documentation Sync (F-008, F-032), and Backend Freeze Declaration (v1.2.8)
