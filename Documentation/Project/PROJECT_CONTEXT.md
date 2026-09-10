# PROJECT_CONTEXT

## Purpose

This document provides the current state of the project for future AI sessions.

It should always remain concise (1–2 pages).

Update this document after every completed implementation phase.

---

## Current Version

v1.2.8 (Phase E Completed — Backend Frozen for Frontend Handoff)

---

## Current Phase

Phase E — Release Activities & Documentation Sync (100% Completed — Backend Frozen)

---

## Project Status

### Completed Modules

- Phase 1 — Infrastructure & Core Architecture
- Phase 2 — Authentication Foundation
- Phase 3 — User Profile & Management
- Phase 4 — Content Foundation & Interaction Engine
- Phase 5 — Communities & Membership
- Phase 6 — Post & Article Engines
- Phase 7 — Media Channels (Video & Podcast)
- Phase 8 — Dashboard Feed & Gamification
- Phase 9 — Global Search & Discovery
- Phase 10 — Audit Trail & Governance (10.1 Infrastructure, 10.2 Suspension Guard, 10.3 Audit Read API, 10.4 Governance Wiring, 10.5 Guard Extension)
- Phase 11 — Jobs & Notifications (generic notification engine)
- Phase 12 — Notification Producers & Final Hardening (100% wired notifications, DI validated, and verified via end-to-end integration test suite)
- Defect Resolution Pass — Reconciled HTTPS redirection, AuthService suspension checks, global ForbiddenException mapper, and JobRepository error handling
- Production Hardening Pass — Enforced strict FK validity checks (`GBV-001`, `M-001/002`), global `ValidationFilter` for automatic DTO validation interception, comprehensive `MaximumLength` constraints across all 12 modules (`B4-001`), and exact status codes/endpoints (`B7-001/002`, `B6-003/B8-001`)
- Phase A (Pre-Frontend Essential Fixes) — Completed F-009 (CreateJob 201 Created), F-010/F-011 (Karma & Notifications role constants), F-012 (AuditLogFilterDto Range validation), F-014 (InteractionController route regex constraints), F-015 (Pagination added to GetMyPosts, GetMyArticles, GetMyVideos, GetMyPodcasts), F-016 (SearchController uniform route template), and F-007 (Scratch project DI registrations)
- Phase B (Architecture Consistency) — Completed F-013 (Unified `KnomeControllerBase` across all 14 controllers), F-028 (Removed direct `_db` access from `UserService` and `CommunityService`), F-029/F-030 (Replaced magic strings with `NotificationTypes.*` constants), F-031 (Renamed generic `_service` fields), and F-020 (Added `ILogger` exception logging in `DeleteProfileImageAsync`)
- Phase C (Performance & Hardening) — Completed F-017 (Bulk `AddRangeAsync` + single `SaveChangesAsync` for notification broadcasts), F-026 (Restricted `KarmaController.AwardKarma` to `Roles.SystemAdmin`), and verified F-027 (`ChangeRoleDto.RoleNames` pre-validation via `ChangeRoleValidator`)
- Phase D (Security Hardening) — Completed F-018 (Environment-specific JWT secret override), F-019 (MIME/magic byte validation in `SaveProfileImageAsync`), F-021 (Explicit `AllowedHosts` configuration), F-022 (`SecurityHeadersMiddleware` pipeline registration), F-023 (Login rate limiting via `LoginRateLimiter`), and F-024 (`PiiScrubbingEnricher` registration in Serilog)
- Phase E (Release Activities & Documentation Sync) — Completed F-008 (`Backend_Verification_Findings.md` synchronized to post-hardening baseline), F-032 (`Production_Readiness_Audit_Part1.md` AutoMapper profile count corrected to 10 distinct profiles), verified post-launch deferral of F-025 (Refresh token infrastructure decision), and declared **Backend Freeze (`v1.2.8`)**.
- Phase 26 (Admin Post Deletion & Cascade Hardening) — Extended admin role authorization in `PostService` to cover all administrators (System Admin, Community Admin, HR Admin) and role codes (`SYSADM`, `CADM`, `HRADM`). Atomically cascade child table deletions in `PostRepository` (`PostMentions`, `PostAudienceCommunities`, `PostAudienceUsers`, comments, reactions, bookmarks, moderation reports, notifications). Fixed author/admin permissions in `PostCard.jsx` and added instant local feed removal via `post-deleted` event dispatch.
- Phase 37 (Post Scheduling Pipeline & Feed Privacy Fix) — Fixed scheduled post visibility leak in `PostRepository.cs` feed query. Aligned validator messages in `CreatePostValidator` and `UpdatePostValidator`. Added author controls (Publish Now & Cancel to Drafts) in `PostCard.jsx` and dedicated "⏰ Scheduled" filter tab in `Posts.jsx`.
- Phase 38 (Community Module End-to-End Excellence & Safeguards) — Linked `AudienceCommunityIds` to `CommunityPosts` in `PostService.cs`. Expanded `communitiesApi` with `createPost`, `pinPost`, `addAdmin`, and `removeAdmin`. Enforced 3-pinned post limit (`FR-CM-06`), Default Org community mandatory membership lock (`FR-CM-04`), Sole Admin safeguard (`FR-CM-05`), and live backend file uploads via `mediaApi.uploadFile` in `CommunityView.jsx`.
- Phase 47 (Enterprise Post Scheduling Workflow & DD/MM/YYYY Refactor) — Overhauled `CreatePostModal.jsx` scheduling popover with Knome enterprise styling, Indian standard `DD/MM/YYYY, hh:mm A` format, minimum 1-minute scheduling with `+1 Min` preset, live countdown card, modal footer scheduled pill chip, and dynamic submit button. Fixed UTC-to-Local timezone comparison bug in `PostService.cs` and `PostRepository.cs` where unreleased scheduled posts were improperly publishing immediately. Verified via live E2E test on SQL Server.
- Phase 48 (Enterprise Article Scheduling Workflow & Activation) — Activated complete article scheduling pipeline across `CreateArticleModal.jsx`, `Articles.jsx` (full-page editor mode and article listing), `articleService.js`, and backend (`CreateArticleDto`, `UpdateArticleDto`, `ArticleDto`, `ArticleRepository`, `ArticleService`, and `ScheduledPostHostedService`). Implemented `DD/MM/YYYY, hh:mm A` standard date formatting, 1-minute scheduling, 6 quick presets (`+1 Min` to `Tomorrow 9 AM`), live preview card, active scheduled pill chip, author privacy enforcement (scheduled articles stay private until release), `"⏰ Scheduled"` queue tab, and immediate `"Publish Now"` override. Fully verified via live end-to-end integration test against SQL Server.
- Phase 49 (Article Modal Rich Text WYSIWYG Toolbar Activation) — Transformed static formatting toolbar in `CreateArticleModal.jsx` into a fully interactive WYSIWYG rich text engine. Implemented `contentEditable` container styled with `.rich-editor-content`, instant toolbar button actions (`Bold`, `Italic`, `Underline`, `Bullet List`, `Numbered List`) using `document.execCommand`, keyboard shortcuts (`Ctrl+B`, `Ctrl+I`, `Ctrl+U`), `onMouseDown={(e) => e.preventDefault()}` selection preservation, real-time active button state tracking via `document.queryCommandState`, empty state placeholder overlay, modal cleanup on open/close, and seamless rich HTML (`ContentHtml`) persistence to backend API and SQL Server database. Verified via live frontend build and API integration script.
- Phase 50 (Admin Console & Governance Moderation Workable Refactor) — Refactored `AdminConsole.jsx` to be 100% workable. Implemented permanent preview modal footer with status-aware resolution audit trail, direct Article content rendering with categories & images, validation-compliant report resolution (`PUT /api/interactions/reports/{id}/resolve` for Dismissed, Removed Content, Reinstated Content), searchable interactive employee picker with reason presets & duration options for user suspension (`PUT /api/users/{id}/suspend`), two-way state synchronization across `usersList` and `UserContext`, top search bar synchronization across all admin tabs, live community channels, and local-storage-backed AI moderation controls. Verified via backend API scratch test and frontend build.
- Phase 51 (Home Feed Multi-Attachment & Scheduled Post Display Fix) — Resolved root cause where multiple files attached to scheduled posts failed to render on the Home page (`Dashboard.jsx`), previously showing broken fallback SVG "Knome Enterprise Media Attachment". Extended backend `FeedItemDto` with `Attachments`, `AttachmentUrls`, `ContentText`, and `Status`. Included author's scheduled posts in `FeedRepository.GetCandidatePostsAsync`. Added extension-based `detectFileType` in `apiService.js` and upgraded `mapFeedItem` to map all attached documents, videos, audios, and images. Hardened `PostCard.jsx` to resolve media URLs across all media players and doc previewers. Verified via live API tests against SQL Server.
- Phase 52 (Post Audiences & Multi-Target Notification System) — Implemented complete audience management system for Create Post (Everyone, Specific Community, Specific Person/Connections) alongside global laptop local time synchronization (`UtcDateTimeJsonConverter`). In `PostService.cs`, added notification generation across all 3 modes: broadcast to all active colleagues for Everyone (`NotificationTypes.HrAnnouncement`), targeted dispatch to all approved members (`Status == 'Approved' || Status == 'Active'`) and creator for Specific Community (`NotificationTypes.Community`), and direct delivery to targeted user IDs with strict feed privacy for Specific Connections (`NotificationTypes.Share`). Enriched `FeedItemDto` and `apiService.js` to map `communityId`, `communityName`, `sharedWithName`, and `audienceUserIds`, rendering dynamic blue community badges and purple direct recipient badges. Verified 100% PASS via automated integration script against live SQL Server.
- Phase 53 (Community-Named Welcome Message & Real-Time Interactions) — Dynamic attribution and real-time interaction refactor for community feeds. Replaced the static hardcoded fallback authored by "Loveneesh Sharma" with dynamically generated welcome posts in the name of the active community (`activeCommName`, role "Official Community Space", pinned), and auto-sanitized legacy seed posts. Activated full real-time interactivity across post action bars: instant optimistic Likes with visual fill and `knome:reaction-updated` broadcast; expandable inline Comments drawer with live comment submissions, instant comment count increments, and restricted word validation; and clickable Share button with direct link copy to clipboard, `ArticleShareModal` opening, and real-time share count updates. Verified via frontend build and API sync.
- Phase 54 (Real-Time Karma Points Update on Post Publication) — Fixed root causes of static Karma point balances upon post publishing. Elevated `KarmaCaps.CreatePostDailyCap` in backend `KarmaConstants.cs` from 10 to 50 points so regular publishing is never choked by testing thresholds. Integrated global window event `karma-updated` in `awardRuleKarma` and introduced `refreshKarma` backend synchronizer. Upgraded `Navbar.jsx` with live listeners for `karma-updated`, `post-created`, and `article-created` and removed `!isSysAdmin` filter so all users (employees and admins) see their points and badge in the top bar. Added live reactive stats in `Sidebar.jsx` (Points, Posts, Followers) and wired post publishing karma awarding across `CreatePostModal.jsx`, `CommunityView.jsx`, and `PostCard.jsx` (Publish Now). Fully verified via live integration test against SQL Server (+2 pts per post).
- Phase 55 (Trending Tags Real-Time Hashtag Matching & Post Deep-Linking) — Resolved disconnected Trending Tags on Dashboard and the `Found 0 results for "#MPOnline"` defect. In `SearchRepository.cs`, implemented `GetQueryTerms` to normalize hashtag queries (stripping `#` to match both `#tag` and `tag` across Posts, Articles, Videos, Communities, Jobs), expanded post search audience to include `Community` posts alongside `Everyone`, enabled tag matching against post content text, and projected informative post snippet titles. In `TrendingTagsWidget.jsx`, dynamically extracts and ranks real hashtags from live posts and feed items with post count badges (e.g. `#DotNet 5`, `#MPOnline 5`, `#devops 8`). In `Search.jsx`, routed post clicks directly to `/posts?id=${id}` and rendered fallback author titles. In `Posts.jsx`, added URL query param support (`?tag=...`, `?q=...`) for deep-link filtering. In `PostCard.jsx`, made inline hashtags clickable to search. Verified with 100% hits across 6 test hashtags via live script and frontend build.
- Phase 56 (Community Welcome Card Cleanup & Rules/FAQ Persistence Engine) — Addressed clutter on official community introduction cards and rules/FAQ persistence bugs in `CommunityView.jsx`. Cleaned up the Welcome Post card by removing regular post moderation buttons (`unpin`, `delete`, `suspend`) and engagement action bar (`like`, `comment`, `share`, `open post`, inline comments drawer), rendering it as an official verified space welcome announcement. Removed broken `person_off` suspension button from post headers. Added an interactive Community Rules & FAQ manager into the Admin Tools tab with add/edit/delete capabilities. Persisted Rules and FAQs to backend SQL Server (`communitiesApi.update`), dedicated local storage (`knome_community_rules_faq_${targetId}`), custom community metadata, and live component state. Added quick "Edit" shortcut buttons in sidebar Rules & FAQ cards for community admins. Verified clean frontend build and responsive UI.
- Phase 57 (Connection Deduplication, Self-Exclusion & Sent Requests Workflow) — Resolved duplicate users and self-user display in People Network (`Network.jsx`). Implemented robust `isCurrentUser`, `isSameUser`, and enhanced `deduplicateUsers` with ID, employee code, and normalized name filtering (stripping parenthesized suffixes) so logged-in users (e.g. Loveneesh Sharma) and duplicate roster entries never appear in Suggestions or Connections. Rewired `handleConnect` so sending a connection request immediately removes the person from "People You May Know" and moves them into the **Connection Requests** tab under **Sent Connection Requests Pending**. Synchronized tab header badges with separate pills for received requests and sent requests, and added sub-filter pills (`All`, `Received`, `Sent Requests`) in the Connection Requests tab. Verified clean frontend and backend builds.
- Phase 58 (Removal of Email Digests & Workable In-App Notification Preferences) — In compliance with architecture constraints deferring email integrations, completely removed the Email column and Email Digests section from `NotificationSettingsModal.jsx` and the Email Digest toggle from `AdminConsole.jsx`. Overhauled `NotificationSettingsModal.jsx` into a modern in-app preference manager with individual toggles for 7 key event types (Comments, Reactions, Followers, Community Invites, Mentions, Community Posts, Job Postings), quick Enable All/Mute All buttons, and per-user `localStorage` persistence. Connected preferences into `Navbar.jsx` to dynamically filter displayed notifications, exclude muted alerts from the unread bell counter, and suppress real-time pop-up toasts and audio chimes for muted categories. Verified via clean frontend and backend production builds.





### Pending Modules

- None (All implementable FRD scope is 100% complete, patched, and hardened)

---

## Architecture

- Database First
- Repository Pattern
- Service Pattern
- ASP.NET Core 9
- SQL Server
- JWT Authentication
- React Frontend

---

## Database Notes

Database changes must originate from SQL Server.

Never manually modify scaffolded models.

---

## Important Decisions

- **Generic Event-Driven Notification Engine (Phase 11)**: `INotificationService.PublishAsync` / `PublishBroadcastAsync` are keyed by opaque `NotificationTypes` categories. Producers (Jobs is first) publish without modifying the notification core. Centralizes gating inside the engine.
- **Job auto-expiry** is handled by a `BackgroundService` (`JobExpiryHostedService`), not by mutating rows on read.

---

## Active Modules

- Audit Trail & Governance (Phase 10): `AuditLog` model + `IAuditLogRepository`/`IAuditLogService`; reusable `ISuspensionGuard`; `AuditLogController` gated to System Administrators; `UserService` suspend/activate actions record audit entries.
- Jobs & Notifications (Phase 11): `JobsController` gated to HR/System-Admin for CRUD with dynamic filtering and auto-expiry; generic `NotificationsController` handling preferences and center counts; Job posting publishes broadcasts via the engine.

---

## Pending Modules & External Integration Decisions

Per project external dependency decisions, the following features are intentionally **OUT OF SCOPE** for the current backend implementation because they depend on external systems under active development by other teams:

1. **HRMS SSO Integration (`/api/auth/sso-login`)**: Preserves existing JWT/role claim extension points and authentication architecture. Live external IDP / HRMS OIDC token exchange is pending external infrastructure delivery.
2. **Email Digest Engine (`FR-NT-02`)**: Background scheduler (`DigestHostedService`) and daily/weekly email digests depend on external corporate SMTP provisioning (`FRD INT-03`).
3. **HRMS-Triggered Synchronization Workflows**: Automatic daily employee department/role synchronization (`LastSyncedFromHrmsDate`) is deferred until external HRMS REST/OData endpoints become available.

Do **NOT** create dummy implementations, fake APIs, placeholder authentication flows, or simulated integrations for these items. They will be integrated only when live external enterprise endpoints are delivered.

---

## Known Issues

None

---

## Technical Debt

None

---

## Next Phase

**Frontend Handoff & Post-Launch Operations (`v1.2.8`)**: The backend (`Knome.API`) is permanently frozen (`v1.2.8`), fully production-ready, and verified (`0 warnings, 0 errors`, 100% DI PASS). All pre-frontend (`Phase A / B`), pre-deployment (`Phase C / D`), and documentation sync (`Phase E`) items have been resolved (`31 / 32 resolved`, 1 deferred post-launch infrastructure item `F-025`).

---

## AI Session Notes

Every new AI session should:

1. Read CLAUDE.md
2. Read PROJECT_CONTEXT.md
3. Read PROJECT_STATUS.md
4. Read latest Development Journal
5. Read relevant FRD section

### AI Resume Instructions

For any future AI session:

1. Read CLAUDE.md
2. Read PROJECT_CONTEXT.md
3. Read PROJECT_STATUS.md
4. Read only the latest Development Journal
5. Read only the relevant FRD section
6. Do not re-read older journals unless explicitly requested.
7. Keep reasoning concise and minimize unnecessary file reads.

Then summarize understanding before implementation.
