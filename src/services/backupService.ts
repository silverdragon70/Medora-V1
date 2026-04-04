import { db } from './db/database';
import { settingsService } from './settingsService';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { format } from 'date-fns';

export type BackupType = 'full' | 'data';

export interface BackupMeta {
  version: number;
  type: BackupType;
  createdAt: string;
  appVersion: string;
}

export interface BackupFile {
  meta: BackupMeta;
  tables: Record<string, any[]>;
}

// ── Export (create backup) ───────────────────────────────────────────────────
export async function createBackup(type: BackupType): Promise<string> {
  const tables: Record<string, any[]> = {};

  // Always backup these
  tables.patients           = await db.patients.toArray();
  tables.hospitals          = await db.hospitals.toArray();
  tables.cases              = await db.cases.toArray();
  tables.investigations     = await db.investigations.toArray();
  tables.management_entries = await db.management_entries.toArray();
  tables.progress_notes     = await db.progress_notes.toArray();
  tables.vitals             = await db.vitals.toArray();
  tables.procedures         = await db.procedures.toArray();
  tables.lectures           = await db.lectures.toArray();
  tables.courses            = await db.courses.toArray();
  tables.settings           = await db.settings.toArray();

  // Images only for full backup
  if (type === 'full') {
    tables.investigation_images = await db.investigation_images.toArray();
    tables.media                = await db.media.toArray();
  }

  const backup: BackupFile = {
    meta: {
      version:    1,
      type,
      createdAt:  new Date().toISOString(),
      appVersion: '1.0.0',
    },
    tables,
  };

  return JSON.stringify(backup);
}

// ── Write to cache & return uri + meta ──────────────────────────────────────
export async function prepareBackup(type: BackupType): Promise<{ uri: string; b64: string; fname: string; sizeMB: string }> {
  const json  = await createBackup(type);
  const b64   = btoa(unescape(encodeURIComponent(json)));
  const rand  = String(Math.floor(Math.random() * 90) + 10);
  const fname = `medora_backup_${format(new Date(), 'dd_MMM_yy')}_${rand}.medora`;
  const sizeMB = `${(json.length / 1024 / 1024).toFixed(1)} MB`;

  const result = await Filesystem.writeFile({
    path: fname, data: b64, directory: Directory.Cache,
  });

  return { uri: result.uri, b64, fname, sizeMB };
}

// ── Save to Downloads ────────────────────────────────────────────────────────
export async function saveBackupToDownloads(b64: string, fname: string, sizeMB: string): Promise<void> {
  await Filesystem.requestPermissions();
  await Filesystem.writeFile({
    path: `Download/${fname}`,
    data: b64,
    directory: Directory.ExternalStorage,
    recursive: true,
  });
  await _saveLastBackupInfo(sizeMB);
  await rotateBackups(fname);
}

// ── Share backup ─────────────────────────────────────────────────────────────
export async function shareBackupFile(uri: string, fname: string, sizeMB: string): Promise<void> {
  await Share.share({ title: fname, url: uri, dialogTitle: 'Save or Share Backup' });
  await _saveLastBackupInfo(sizeMB);
}

async function _saveLastBackupInfo(sizeMB: string): Promise<void> {
  await settingsService.set('lastBackupDate', format(new Date(), 'dd MMM yyyy · HH:mm'));
  await settingsService.set('lastBackupSize', sizeMB);
  await settingsService.set('lastBackupDest', 'local');
}

// ── Rotate old backups ───────────────────────────────────────────────────────
async function rotateBackups(newFile: string): Promise<void> {
  try {
    const keepCount = parseInt(await settingsService.get('backupKeepCount') ?? '3');
    const stored = JSON.parse(await settingsService.get('backupFileList') ?? '[]') as string[];
    stored.push(newFile);

    // Remove oldest if over limit
    while (stored.length > keepCount) {
      const oldest = stored.shift();
      if (oldest) {
        try {
          await Filesystem.deleteFile({ path: `Download/${oldest}`, directory: Directory.ExternalStorage });
        } catch { /* file may not exist */ }
      }
    }
    await settingsService.set('backupFileList', JSON.stringify(stored));
  } catch { /* non-critical */ }
}

// ── Restore ──────────────────────────────────────────────────────────────────
export async function restoreBackup(base64Content: string): Promise<void> {
  const json = decodeURIComponent(escape(atob(base64Content)));
  const backup: BackupFile = JSON.parse(json);

  if (!backup.meta || !backup.tables) {
    throw new Error('Invalid backup file');
  }

  // Clear existing data
  await db.transaction('rw',
    [db.patients, db.hospitals, db.cases, db.investigations,
     db.investigation_images, db.management_entries, db.progress_notes,
     db.vitals, db.media, db.procedures, db.lectures, db.courses, db.settings],
    async () => {
      await Promise.all([
        db.patients.clear(),
        db.hospitals.clear(),
        db.cases.clear(),
        db.investigations.clear(),
        db.investigation_images.clear(),
        db.management_entries.clear(),
        db.progress_notes.clear(),
        db.vitals.clear(),
        db.media.clear(),
        db.procedures.clear(),
        db.lectures.clear(),
        db.courses.clear(),
        db.settings.clear(),
      ]);

      // Restore each table
      for (const [table, rows] of Object.entries(backup.tables)) {
        if (rows.length === 0) continue;
        await (db as any)[table].bulkAdd(rows);
      }
    }
  );
}

// ── Scheduled backup check ───────────────────────────────────────────────────
export async function checkAndRunScheduledBackup(): Promise<void> {
  const schedule = await settingsService.get('backupSchedule') ?? 'off';
  if (schedule === 'off') return;

  const lastRun = await settingsService.get('backupLastScheduledRun');
  const now = new Date();

  if (lastRun) {
    const last = new Date(lastRun);
    const diffDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    if (schedule === 'daily'   && diffDays < 1)  return;
    if (schedule === 'weekly'  && diffDays < 7)  return;
    if (schedule === 'monthly' && diffDays < 30) return;
  }

  const type = (await settingsService.get('backupType') ?? 'data') as BackupType;
  const { b64, fname, sizeMB } = await prepareBackup(type);
  await saveBackupToDownloads(b64, fname, sizeMB);
  await settingsService.set('backupLastScheduledRun', now.toISOString());
}
