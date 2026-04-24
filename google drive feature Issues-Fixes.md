# 📂 Google Drive Sync: Production-Grade Technical Blueprint for Capacitor Apps

This document is a comprehensive architectural guide for implementing a robust, client-side Google Drive synchronization system for hybrid mobile applications. It captures the engineering decisions, failed pathways, and the ultimate production-ready architecture.

---

## 1. 🏗️ System Architecture (Deep Dive)

The system is designed as a **four-layer architecture** to ensure separation of concerns and platform independence.

*   **UI Layer (React/Vite)**: Handles user interaction, progress visualization (`SyncProgressSheet`), and manual token entry for fallbacks.
*   **Backup/Data Layer (`backupService.ts`)**: Responsible for data extraction (SQLite/JSON), serialization (JSON to Base64), and optional client-side encryption.
*   **Google Drive API Layer (`googleDriveService.ts`)**: A low-level REST wrapper that communicates with Google's v3 API using `fetch`. It manages folder discovery, multi-part uploads, and file listing.
*   **Auth Layer (OAuth 2.0 Implicit Flow)**: A headless authentication system designed to work inside Capacitor's `Browser` plugin without relying on native SDKs.

**Data Flow:**
1. User triggers sync → 2. `backupService` serializes DB → 3. `googleDriveService` checks for "App Folder" → 4. Multi-part REST request initiates → 5. Rotation logic trims old files.

---

## 2. 🚀 Full Implementation Plan (From Zero)

### Google Cloud Console Config
1.  **Project**: Dedicated project for the app.
2.  **API**: Enable **Google Drive API**.
3.  **OAuth Consent**: External, add `.../auth/drive.file` (Scope limitation is key for security).
4.  **Credentials**: Create **OAuth 2.0 Client ID** as TYPE: **Web Application**.

### Why Web Client ONLY?
We ignore Android/iOS Client IDs because they enforce strict native handshakes (SHA-1/Bundle ID) that modern mobile browsers often block when redirected back to a hybrid app. The **Web Client ID** using `http://localhost/` is the "Universal Key" for mobile hybrid apps.

---

## 3. 🔐 Authentication System (THE CRITICAL PART)

### Why Native OAuth Fails in Capacitor
Native SDKs often crash or fail due to missing `google-services.json` or signature mismatches. Browsers (Chrome/Safari) have hardened security policies that block custom URI schemes (`com.app://`) unless the app is verified via App Links/Universal Links (which require expensive server hosting).

### ❌ Failed Approaches & Dead Ends
1.  **Android Client ID**: Blocked. Google rejects custom redirect schemes for Android IDs in standard browsers.
2.  **Authorization Code Flow**: Requires a backend server to exchange the "code" for a "token". (Not suitable for serverless client-only apps).
3.  **Native Plugins**: Prone to breaking with OS updates (Android 14+ issues) and increase binary size.

### ✅ The Winning Solution: Manual Token Flow (Web Client ID)
We use the **Implicit Flow** with a manual safety net.
*   **URL Structure**: `https://accounts.google.com/o/oauth2/v2/auth?client_id=[WEB_ID]&redirect_uri=http://localhost/&response_type=token&scope=[DRIVE_FILE]`
*   **The "Loopback" Trick**: We redirect to `http://localhost/`. The browser fails to load it (which is good), keeping the URL (containing the `access_token` in the hash) visible in the address bar.
*   **Manual Fallback**: If the app fails to intercept the link automatically, the user copies the URL from Chrome and pastes it into the app. The app then parses the hash to extract the token.

---

## 4. 🛠️ Core Services Design (Code Snippets)

### `googleDriveService.ts`
```typescript
// Core functions for implementing Drive logic
export async function uploadBackupToDrive(type: BackupType) {
  const folderId = await getOrCreateFolder();
  const { b64, fname, sizeMB } = await prepareBackup(type);
  // Perform multi-part upload...
}

export function processManualOAuthUrl(url: string) {
  const hash = url.split('#')[1];
  const params = new URLSearchParams(hash);
  return params.get('access_token');
}
```

### `backupService.ts`
```typescript
// Serialization and Extraction
export async function createBackup(type: BackupType) {
  const tables = { patients: await db.patients.toArray(), ... };
  return JSON.stringify({ meta: { ... }, tables });
}
```

---

## 5. 📤 API Implementation Details (Multipart Upload)

Google Drive API v3 requires a **multipart/related** content type to upload metadata (filename, folder) and file content in one request.

```http
POST /upload/drive/v3/files?uploadType=multipart HTTP/1.1
Content-Type: multipart/related; boundary=foo_bar_boundary
Authorization: Bearer [ACCESS_TOKEN]

--foo_bar_boundary
Content-Type: application/json; charset=UTF-8

{ "name": "backup.medora", "parents": ["FOLDER_ID"] }

--foo_bar_boundary
Content-Type: application/octet-stream

[BASE64_DATA_OR_BINARY]
--foo_bar_boundary--
```

---

## 6. 🔄 Backup Rotation & Restore Logic

### Rotation Logic (Keep Last N)
1. List files in folder using `q: 'FOLDER_ID' in parents`.
2. Sort list by `createdTime` DESC.
3. If `length > N`, delete files from index `N` onwards using `DELETE /files/[FILE_ID]`.

### Restore Flow
1. Fetch list → 2. Download file metadata → 3. Get media (`?alt=media`) → 4. Base64 Decode → 5. JSON Parse → 6. DB `bulkAdd`.

---

## 7. ⚠️ Error Handling & Edge Cases

*   **Expired Tokens**: Re-trigger Flow. Avoid storing tokens long-term; keep session-based.
*   **Partial Uploads**: The REST API is atomic for small files; but always verify `response.ok`.
*   **API Quota**: Drive API is generous, but implemented debouncing on the "Sync Now" button to prevent spamming.

---

## 8. 🔍 Real Troubleshooting (CRITICAL)

| Issue | Reason | Fix |
| :--- | :--- | :--- |
| **Error 400: invalid_request** | Using Android Client ID with custom scheme. | Switch to **Web Client ID** with `http://localhost/`. |
| **Infinite Sync Loop** | State update re-triggering `useEffect`. | Use `useRef` (e.g., `syncStartedRef`) to guard execution. |
| **App Crash on Connect** | Broken Native plugin dependencies. | Remove `@codetrix-studio/capacitor-google-auth` and use `@capacitor/browser`. |

---

## 9. 📁 Folder Strategy: Why not Root?
We never backup to the root. We search for a folder named `Medora Backups`. If missing, we create it once. This keeps the user's Drive clean and prevents users from accidentally deleting the files while cleaning their drive.

**Folder Search Query:** `name = 'Medora Backups' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`

---

## 10. 🛡️ Security Considerations
*   **Scope Limitation**: Only use `drive.file`. This ensures your app **cannot** see the user's photos, documents, or other app backups.
*   **Token Security**: Tokens are stored in a volatile `let` variable or encrypted `settingsService`. Never log tokens to the console.

---

## 11. 🏗️ Sepration of Concerns (Clean Code)
1.  **Service Boundary**: `googleDriveService` doesn't know about `Dexie` or `SQLite`. It only handles `blobs/b64`.
2.  **UI Boundary**: Sheets and Modals only know about `loading` states and `onComplete` callbacks.

---

## 12. ✅ Step-by-Step Execution Guide

1.  [ ] Setup Google Cloud Console (Web Client + drive.file).
2.  [ ] Implement `signInWithGoogle` using `Capacitor Browser`.
3.  [ ] Build `handleGoogleOAuthCallback` to listen for deep links.
4.  [ ] Create `Manual Fallback` UI for link pasting.
5.  [ ] Implement `prepareBackup` (Serialization).
6.  [ ] Implement `uploadBackupToDrive` (Multipart REST).
7.  [ ] Build `GoogleRestoreSheet` (Listing + Downloading).
8.  [ ] Add `Rotation Logic` to prevent Drive bloat.
9.  [ ] Verify with **Android 14+** to ensure no security crashes.

---
*Blueprint by Senior Engineer - Medora Technical Team*
*Date: April 2026*
