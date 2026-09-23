# Phase 154: Community Member Permanent Removal & Persistence Fix

## Context & Problem Statement
When an authorized Community Admin (e.g., Vilash Deshmukh, `MPO089`) clicked `[ - Remove ]` on a community member (e.g., Deepak Simrodia, `mpo652` in Community 195), the UI temporarily removed the member from the local React state and displayed a success toast: *"Deepak Simrodia has been removed from this community."*

However, upon refreshing the page (`F5` / reload), the removed member reappeared in the Community Members roster.

### Root Cause Analysis
1. **Missing Backend Delete Endpoint**:
   `Backend/Knome.API/Controllers/CommunityController.cs` and `ICommunityService.cs` lacked a dedicated endpoint to remove a regular community member. The repository method `RemoveMemberAsync(CommunityMember member)` existed, but had no corresponding service method or controller route.
2. **Frontend Skipped Backend Deletion for Members**:
   In `knomeUI/frontend/src/pages/CommunityView.jsx`, `handleConfirmRemoveMember` checked `if (isTargetAdmin) await communitiesApi.removeAdmin(...)`. For standard members (contributors/subscribers), no API call was dispatched to the backend at all! The record in SQL Server `[dbo].[CommunityMembers]` remained intact with status `'Approved'`.
3. **Optimistic Overwrite on Refresh**:
   Upon page refresh, `CommunityView.jsx` invoked `loadData()`, which called `communitiesApi.getMembers(communityId)`. Because the member was still in SQL Server, the backend returned them in `rawMembers`, and `rawMembers.forEach(addUniqueMember)` repopulated the member into the roster.
4. **Unfiltered Member Roster in Repository**:
   When `status` was null, `CommunityRepository.GetMembersAsync` did not filter by `Status == 'Approved'`, returning all records regardless of state.

---

## Architectural & Implementation Changes

### 1. Backend Service & Controller (`Backend/Knome.API`)
- **`ICommunityService.cs` & `CommunityService.cs`**:
  - Implemented `RemoveMemberAsync(int communityId, int targetUserId, int currentUserId)`.
  - Enforced permission checks via `CheckIsAdminOrSysAdminAsync`.
  - Blocked removal from `Default`/`Org` communities (FR-CM-04).
  - Protected sole community admins (prohibiting removal if they are the last admin).
  - Cleaned up admin associations if the user was also an admin (`RemoveCommunityAdminAsync`).
  - Removed the `CommunityMember` row from `_db.CommunityMembers` via `_repo.RemoveMemberAsync(member)`.
  - Dispatched in-app notification to the removed member.
- **`CommunityController.cs`**:
  - Exposed `DELETE /api/communities/{communityId}/members/{targetUserId}` with `200 OK` response envelope.
- **`CommunityRepository.cs`**:
  - Updated `GetMembersAsync` so that when `status` is null, it automatically filters by `m.Status == CommunityMemberStatuses.Approved || m.Status == "Active"`.

### 2. Frontend API Client (`knomeUI/frontend/src/utils/apiService.js`)
- Added `removeMember: (communityId, targetUserId) => apiClient.delete('/Communities/' + communityId + '/members/' + targetUserId)`.

### 3. Frontend Community View (`knomeUI/frontend/src/pages/CommunityView.jsx`)
- **`handleConfirmRemoveMember`**:
  - Asynchronously dispatches `communitiesApi.removeMember(targetId, memberId)` to delete the membership in SQL Server.
  - Maintains a persistent tombstone key `knome_community_removed_${targetId}` containing removed user IDs and employee IDs.
  - Purges the member from `knome_community_members_${targetId}`.
  - Cleans up `knome_joined_communities_${memberId}` in localStorage for the target user.
  - Decrements community member count.
- **`loadData()`**:
  - Excludes any members whose ID or employee ID matches `knome_community_removed_${targetId}` during merge of `rawMembers` and local cache.
- **`handleAddSelectedMembers`**:
  - Clears re-enrolled members from `knome_community_removed_${targetId}` so colleagues can be legitimately re-added in the future.

---

## Verification & Proof
1. **Compilation**:
   - `Backend/Knome.API`: `dotnet build -nologo` succeeded with 0 errors.
   - `knomeUI/frontend`: `npm run build` completed in 1.13s; output copied to IIS `C:\inetpub\wwwroot\knome\`.
2. **Automated Verification Script (`scratch/test_remove_member_api.py`)**:
   - Authenticated as Vilash Deshmukh (`MPO089`, Admin of Community 195).
   - Verified initial count: 4 members (including Deepak Simrodia, `mpo652`).
   - Dispatched `DELETE /api/Communities/195/members/1057`: returned `200 OK`.
   - Verified roster after deletion: 3 members (Deepak Simrodia omitted).
   - Directly queried SQL Server: `SELECT COUNT(*) FROM CommunityMembers WHERE CommunityId = 195 AND UserId = 1057` returned `0`.
   - Tested re-adding via `POST /api/Communities/195/members/bulk`: successfully restored to 4 members.
   - Tested deletion again: returned `200 OK`, leaving 3 members permanently.
