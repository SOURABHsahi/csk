# Development Journal — Phase 153: Community "Share with Users" Full Employee Roster & Real-Time Search Filter

## Overview
In the Community details page ([CommunityView.jsx](file:///d:/Knome%20main/knomeUI/frontend/src/pages/CommunityView.jsx)), when clicking the Share button and selecting "Share with Users", the modal previously displayed only a limited subset of users directly from `contextUsers` (3-4 users) and completely lacked a search bar. The user requested:
1. Seeing all MPOnline employees in this list.
2. Adding a search option to filter employees in real-time.

## Root Cause Analysis
- In `CommunityView.jsx` line 5168, the `shareTab === 'users'` view was rendering only `(contextUsers || [])` without tapping into the complete platform employee roster (`allAvailableUsers`, `INITIAL_USERS`, and dynamic users).
- There was no search query state variable (`shareUserSearchQuery`) or search input interface in the "Share with Users" sub-view.
- Users had to manually scroll through an unindexed, truncated list without any filtering or "Select All / Deselect All" helpers.

## Changes Implemented

### 1. Unified Employee Pool & Real-Time Filtering
- Added `shareUserSearchQuery` state in `CommunityView.jsx`.
- Created `allShareEligibleUsers` using `useMemo`, aggregating:
  - `allAvailableUsers` (fetched live from backend `/search/users?pageSize=100` and `knome_custom_users`)
  - `contextUsers` (live UserContext)
  - `INITIAL_USERS` (official seed employee roster)
- Excluded currently logged-in user from the recipient list.
- Deduplicated candidates by normalized employee ID and user ID, and sorted them alphabetically by name.
- Created `filteredShareUsers` using `useMemo` to filter candidates in real-time by:
  - Full Name
  - Employee ID (`MPOxxx` / `MPxxx`)
  - Designation / Role
  - Department

### 2. Search & Selection UI Enhancements
- Added a search filter bar with search icon, placeholder (`Search employees by name, employee ID, designation, department...`), and a one-click clear button (`close`).
- Implemented real-time text matching highlights using the `<HighlightText text={...} query={shareUserSearchQuery} />` component.
- Added a Quick Actions bar with:
  - Total eligible/filtered count indicator.
  - Interactive **"Select All" / "Deselect All"** button for currently filtered candidates.
- Added a selected employee chips tray with individual remove buttons (`close`) when team members are selected.
- Increased list container height (`max-h-56`) with smooth scrolling and responsive layout.
- Added a dedicated empty state: "No team members found" with a prompt to adjust search terms.
- Updated notification sender lookup to search `allShareEligibleUsers` so notifications dispatch with correct employee details across all platform users.

## Verification
- Clean frontend production build (`npm run build` in 2.12s, 0 errors).
- Build output deployed to IIS (`C:\inetpub\wwwroot\knome\`).
- Verified that all MPOnline employees are displayed, search filters dynamically by name, ID, or department, and selection is preserved.
