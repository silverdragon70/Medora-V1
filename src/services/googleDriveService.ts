import { settingsService } from './settingsService';
import { prepareBackup } from './backupService';
import type { BackupType } from './backupService';
import { format } from 'date-fns';

const WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const DRIVE_API     = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API    = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_NAME   = 'Medora Backups';
const SCOPES        = 'https://www.googleapis.com/auth/drive.file email profile';

let accessToken: string | null = null;

export function getAccessToken(): string | null { return accessToken; }
export function isSignedIn(): boolean { return !!accessToken; }

// ── Load Google script locally ────────────────────────────────────────────────
function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof (window as any).google !== 'undefined') { resolve(); return; }
    const script = document.createElement('script');
    script.src = '/gsi-client.js';
    script.async = true;
    script.onload  = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
}

// ── Sign In — uses popup flow (no redirect needed) ────────────────────────────
export async function signInWithGoogle(): Promise<{ email: string; name: string; token: string }> {
  await loadGoogleScript();
  return new Promise<{ email: string; name: string; token: string }>((resolve, reject) => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: WEB_CLIENT_ID,
        scope: SCOPES,
        callback: async (response: any) => {
          if (response.error) { reject(new Error(response.error)); return; }
          accessToken = response.access_token;
          try {
            const res  = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const info = await res.json();
            const email = info.email ?? '';
            const name  = info.name  ?? '';
            await settingsService.set('googleEmail',    email);
            await settingsService.set('googleName',     name);
            await settingsService.set('googleSignedIn', 'true');
            resolve({ email, name, token: accessToken! });
          } catch (e) { reject(e); }
        },
        error_callback: (err: any) => reject(new Error(err?.message ?? 'OAuth error')),
      });
      // requestAccessToken with empty prompt = inline popup inside WebView
      client.requestAccessToken({ prompt: '' });
    } catch (e: any) { reject(e); }
  });
}

// ── Sign Out ──────────────────────────────────────────────────────────────────
export async function signOutGoogle(): Promise<void> {
  if (accessToken) {
    (window as any).google?.accounts.oauth2.revoke(accessToken, () => {});
    accessToken = null;
  }
  await settingsService.set('googleSignedIn', 'false');
  await settingsService.set('googleEmail', '');
  await settingsService.set('googleName',  '');
}

// ── Get or create Medora Backups folder ───────────────────────────────────────
async function getOrCreateFolder(): Promise<string> {
  const search = await fetch(
    `${DRIVE_API}/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await search.json();
  if (data.files?.length > 0) return data.files[0].id;

  const create = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  });
  const folder = await create.json();
  return folder.id;
}

// ── Upload backup to Drive ────────────────────────────────────────────────────
export async function uploadBackupToDrive(type: BackupType): Promise<string> {
  if (!accessToken) throw new Error('Not signed in to Google');
  const { b64, fname, sizeMB } = await prepareBackup(type);
  const folderId = await getOrCreateFolder();

  const binary = atob(b64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'application/octet-stream' });

  const boundary = '-------medora_boundary';
  const metadata = JSON.stringify({ name: fname, parents: [folderId] });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
    blob,
    `\r\n--${boundary}--`,
  ], { type: `multipart/related; boundary="${boundary}"` });

  const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);

  await settingsService.set('lastBackupDate', format(new Date(), 'dd MMM yyyy · HH:mm'));
  await settingsService.set('lastBackupSize', sizeMB);
  await settingsService.set('lastBackupDest', 'gdrive');
  await rotateGdriveBackups(folderId);
  return fname;
}

// ── List backups ──────────────────────────────────────────────────────────────
export async function listDriveBackups(): Promise<{ id: string; name: string; size: string; date: string }[]> {
  if (!accessToken) return [];
  const folderId = await getOrCreateFolder();
  const res = await fetch(
    `${DRIVE_API}/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,size,modifiedTime)&orderBy=modifiedTime desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  return (data.files ?? []).map((f: any) => ({
    id:   f.id,
    name: f.name,
    size: f.size ? `${(parseInt(f.size) / 1024 / 1024).toFixed(1)} MB` : '—',
    date: f.modifiedTime ? format(new Date(f.modifiedTime), 'dd MMM yyyy') : '—',
  }));
}

// ── Download backup ───────────────────────────────────────────────────────────
export async function downloadBackupFromDrive(fileId: string): Promise<string> {
  if (!accessToken) throw new Error('Not signed in');
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Download failed');
  const blob   = await res.blob();
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload  = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Rotate old backups ────────────────────────────────────────────────────────
async function rotateGdriveBackups(folderId: string): Promise<void> {
  try {
    const keepCount = parseInt(await settingsService.get('backupKeepCount') ?? '3');
    const res  = await fetch(
      `${DRIVE_API}/files?q='${folderId}' in parents and trashed=false&fields=files(id,modifiedTime)&orderBy=modifiedTime asc`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data  = await res.json();
    const files = data.files ?? [];
    while (files.length > keepCount) {
      const oldest = files.shift();
      await fetch(`${DRIVE_API}/files/${oldest.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }
  } catch { /* non-critical */ }
}
