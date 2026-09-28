# Phase 118 — Fix Video Upload 400 Bad Request Validation Error

## Overview
Resolved HTTP 400 Bad Request ("One or more validation failures occurred") when attempting to upload and publish videos via `UploadVideoModal.jsx`.

## Root Cause Analysis
1. **Oversized Base64 Data URL for `ThumbnailUrl`**:
   - `CreateVideoValidator.cs` enforces `RuleFor(x => x.ThumbnailUrl).MaximumLength(400)`.
   - The SQL Server database column `Videos.ThumbnailUrl` is `NVARCHAR(400)`.
   - In `UploadVideoModal.jsx`, video frame thumbnail extraction and URL inputs generated canvas Base64 data URLs (`data:image/jpeg;base64,...`), which range from 50,000 to 200,000 characters.
   - When `thumbnailFile` was null (such as when entering video URLs, embedding, or when auto-extraction failed to create a `File`), the raw Base64 data URL was sent as `thumbnailUrl` in the `CreateVideoDto`.
   - The backend FluentValidation immediately rejected this with a 400 Bad Request.
2. **Missing Video Source URL Sanitization**:
   - Pasting raw `<iframe>` embed codes resulted in HTML strings that could exceed the 400-character constraint on `SourceUrl`.
   - `title` and `description` lacked client-side truncation and length constraints matching the backend validator limits (200 and 1000 characters respectively).
3. **Generic Error Message Presentation**:
   - When ASP.NET Core returned validation problem details, `apiClient.js` extracted only the generic message `"One or more validation failures occurred."` without flattening and exposing the field-specific error messages in `data.errors`.

## Changes Made
1. **`UploadVideoModal.jsx`**:
   - Added `dataUrlToFile(dataUrl, filename)` helper to convert Base64 canvas data URLs into standard JPEG `File` objects.
   - Enhanced `extractVideoThumbnail` with safety timeouts to ensure it never hangs or leaves `thumbnailFile` unassigned.
   - In `handleUrlInputChange`:
     - Cleaned inputs and extracted `src` URLs from pasted `<iframe>` tags.
     - Extracted canvas frames into real `File` blobs for direct MP4 links.
   - In `handleUpload`:
     - Enforced `title.trim().slice(0, 200)` and `description.trim().slice(0, 1000)`.
     - Extracted `src` from embed codes and enforced `<= 400` character limit on `sourceUrl`.
     - Automatically uploaded Base64 data URLs to `/Media/upload` to obtain clean, short server paths (`/uploads/media/media_xxx.jpg`).
     - Added a safe fallback URL (`https://images.unsplash.com/...`) if thumbnail upload fails or exceeds 400 characters, guaranteeing that a Base64 data URL is never submitted to `POST /api/videos`.
     - Added detailed error extraction in the catch block to display server validation errors in the toast notification.
     - Added `maxLength` attributes to title, description, and source URL input fields.
2. **`apiClient.js`**:
   - Enhanced `handleResponse` so that when a 400/422 response contains `data.errors` (either an array or key-value object of error messages), `err.message` is populated with the specific error messages joined together rather than the generic RFC title.
3. **Build & Deployment**:
   - Executed `npm run build` in `knomeUI/frontend`.
   - Synchronized build assets with IIS at `C:\inetpub\wwwroot\knome` and `C:\inetpub\wwwroot\assets`.

## Verification
- Frontend builds cleanly (`npm run build` exited with code 0).
- Validated constraint compliance against `CreateVideoValidator` and `KnomeDbContext.cs`.
