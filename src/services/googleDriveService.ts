import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { settingsService } from './settingsService';
import { prepareBackup } from './backupService';
import type { BackupType } from './backupService';
import { format } from 'date-fns';

const WEB_CLIENT_ID = '271141142279-ec3u3nd5p4fm2mi7uahtoro7eskobpbr.apps.googleusercontent.com';
const DRIVE_API     = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API    = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_NAME   = 'Medora Backups';
const SCOPES        = 'https://www.googleapis.com/auth/drive.file email profile';

// On mobile/Capacitor, we use http://localhost/ as it's the app's internal origin
const REDIRECT_URI = Capacitor.isNativePlatform() 
  ? 'http://localhost/' 
  : `${window.location.origin}/`;

let accessToken: string | null = null;

export function getAccessToken(): string | null { return accessToken; }
export function isSignedIn(): boolean { return !!accessToken; }

// ── Sign In — uses Browser flow ─────────────────────────────────────────────
export async function signInWithGoogle(): Promise<{ email: string; name: string; token: string }> {
  return new Promise<{ email: string; name: string; token: string }>(async (resolve, reject) => {
    try {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${WEB_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${encodeURIComponent(SCOPES)}&prompt=select_account`;
      
      (window as any)._googleResolve = resolve;
      (window as any)._googleReject  = reject;

      await Browser.open({ url: authUrl, windowName: '_self' });

      // Safety timeout
      setTimeout(() => {
        if ((window as any)._googleResolve) {
          delete (window as any)._googleResolve;
          delete (window as any)._googleReject;
          reject(new Error('Sign-in timed out'));
        }
      }, 300000);
    } catch (e: any) { 
      delete (window as any)._googleResolve;
      delete (window as any)._googleReject;
      reject(e); 
    }
  });
}

/**
 * Manually process a URL pasted by the user (fallback)
 */
export async function processManualOAuthUrl(url: string): Promise<{ email: string; name: string; token: string }> {
  const hash = url.split('#')[1];
  if (!hash) throw new Error('Invalid URL: No token found');

  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  if (!token) throw new Error('Token missing in URL');

  accessToken = token;
  
  const res  = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user info');
  
  const info = await res.json();
  const email = info.email ?? '';
  const name  = info.name  ?? '';
  
  await settingsService.set('googleEmail',    email);
  await settingsService.set('googleName',     name);
  await settingsService.set('googleSignedIn', 'true');
  
  return { email, name, token: accessToken };
}

/**
 * Handle the deep link callback from Capacitor (called from App.tsx)
 */
export async function handleGoogleOAuthCallback(url: string) {
  try {
    await Browser.close();
  } catch (e) { /* ignore */ }
  
  try {
    const result = await processManualOAuthUrl(url);
    if ((window as any)._googleResolve) {
      (window as any)._googleResolve(result);
    }
  } catch (e) {
    if ((window as any)._googleReject) (window as any)._googleReject(e);
  } finally {
    delete (window as any)._googleResolve;
    delete (window as any)._googleReject;
  }
}

// ── Sign Out ──────────────────────────────────────────────────────────────────
export async function signOutGoogle(): Promise<void> {
  accessToken = null;
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
