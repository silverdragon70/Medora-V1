# Google Drive Sync Implementation Guide & Troubleshooting Lexicon

This document provides a comprehensive technical blueprint for implementing Google Drive synchronization in a Capacitor-based mobile application (Android/iOS/Web). It includes the architecture, core functions, and a detailed post-mortem of the authentication challenges faced and solved.

---

## 1. Overview & Architecture
The feature allows users to back up their local application data (SQLite/JSON) to a private "Medora Backups" folder on their personal Google Drive.

**Key Architecture Components:**
- **Frontend**: React (Vite) with Tailwind CSS.
- **Native Bridge**: Capacitor JS.
- **Backend**: Google Drive API v3 (Rest API).
- **Security**: AES-256 Client-side encryption (Optional).

---

## 2. Core Components & File Structure

### 2.1. `googleDriveService.ts` (The Engine)
*Path: `src/services/googleDriveService.ts`*
This service handles all REST calls to Google APIs.
- `signInWithGoogle()`: Launches the browser-based OAuth2 flow.
- `processManualOAuthUrl(url)`: Extracts the `access_token` from a redirected URL hash.
- `uploadBackupToDrive(type)`: Multi-part upload (Metadata + Binary Blob).
- `getOrCreateFolder()`: Logic to find or create the application's specific backup folder.
- `rotateGdriveBackups()`: Maintains a sliding window of backups (e.g., keep last 3).

### 2.2. `backupService.ts` (The Data Preparer)
*Path: `src/services/backupService.ts`*
Responsible for gathering data and formatting it.
- `prepareBackup()`: Serializes database/state into a Base64 string.
- `checkAndRunScheduledBackup()`: Triggers background sync based on user frequency.

### 2.3. `App.tsx` (The Listener)
*Path: `src/App.tsx`*
- `DeepLinkHandler`: Uses `@capacitor/app` to listen for `appUrlOpen` events to intercept successful OAuth redirects.

---

## 3. Implementation Steps (From Scratch)

1.  **Google Cloud Console Setup**:
    - Create a Project.
    - Enable **Google Drive API**.
    - Configure **OAuth Consent Screen** (External, add `.../auth/drive.file` scope).
    - Create **OAuth 2.0 Client IDs**:
        - **Web Client ID**: For web and general redirect logic.
        - **Authorized Redirect URIs**: Should include `http://localhost/` for mobile loopback.

2.  **Environment Variables**:
    - Store `VITE_GOOGLE_CLIENT_ID` in `.env`.

3.  **Scopes Required**:
    - `https://www.googleapis.com/auth/drive.file` (Permits access ONLY to files created by the app).
    - `email`, `profile`.

---

## 4. Troubleshooting & Lessons Learned (The "Battle Logs")

### 4.1. The Crisis: `Error 400: invalid_request`
During Android deployment, the standard browser flow failed repeatedly with an "invalid_request" error or "Custom URI scheme is not enabled".

### 4.2. Failed Attempts (The "Dead Ends")

| Attempt | Strategy | Result | Why it failed? |
| :--- | :--- | :--- | :--- |
| **#1** | **Native Android Client ID** | FAILED | Google's modern policy blocks custom URI schemes (`com.app://`) in standard browser flows for Android Client types. |
| **#2** | **Capacitor Native Auth Plugin** | FAILED | Crashed (`InvocationTargetException`) because it strictly requires a `google-services.json` file and full Firebase integration, which adds unnecessary bloat. |
| **#3** | **iOS Client ID Hack** | FAILED | While it bypasses scheme restrictions, it often requires `response_type=code` which needs a backend server to exchange the code for a token. |
| **#4** | **Localhost Redirect** | PARTIAL | Google accepted the redirect to `http://localhost/`, but the mobile browser couldn't "hand over" the token to the app because `http` isn't a custom scheme. |

### 4.3. The Winning Solution: "Manual Token Fallback" (Web Client ID)

The final, unblockable solution relies on the **Web Client ID** (Type: Web Application) in the Google Cloud Console. 

**Why Web Client ID?**
- **Implicit Flow**: Compatible with `response_type=token` for direct token delivery.
- **Localhost Support**: Allows using `http://localhost/` as a safe redirect landing page.
- **Zero-Config**: Works on Android/iOS without needing platform-specific SHA-1 or Bundle ID registration for the authentication part.

**The Workflow:**
1.  **Step 1**: Launch the Web OAuth flow using the **Web Client ID** and `redirect_uri=http://localhost/`.
    - **Step 2**: The user selects their account in Chrome.
    - **Step 3**: Chrome redirects to `http://localhost/#access_token=...` and shows "Site can't be reached".
    - **Step 4**: **Manual Intervention**: The user copies the URL from Chrome's address bar and pastes it into a dedicated input field in the app.
    - **Step 5**: The app parses the `access_token` from the string using the `processManualOAuthUrl` function.

**Why this works?**
- It bypasses all native OS deep-linking restrictions.
- It bypasses Google's block on custom schemes for Android IDs.
- It doesn't require Firebase or complex native plugins.

---

## 5. Security Note
Even though we use a manual paste method, the `access_token` is short-lived (60 mins) and only grants access to the app's own files (`drive.file` scope). User passwords are never touched.

---
*Documented by Antigravity AI - April 2026*
