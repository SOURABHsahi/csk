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
