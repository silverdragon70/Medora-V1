import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Cloud, Loader2, RefreshCw, Download } from 'lucide-react';
import { uploadBackupToDrive, listDriveBackups, downloadBackupFromDrive, isSignedIn } from '@/services/googleDriveService';
import { restoreBackup } from '@/services/backupService';
import { settingsService } from '@/services/settingsService';
import type { BackupType } from '@/services/backupService';
import { toast } from 'sonner';

const GDriveBackupSheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [uploading,  setUploading]  = useState(false);
  const [restoring,  setRestoring]  = useState<string | null>(null);
  const [backups,    setBackups]    = useState<{ id: string; name: string; size: string; date: string }[]>([]);
  const [loading,    setLoading]    = useState(false);

  const loadBackups = async () => {
    setLoading(true);
    try { setBackups(await listDriveBackups()); }
    catch { setBackups([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (open && isSignedIn()) loadBackups(); }, [open]);

  const handleUpload = async () => {
    setUploading(true);
    try {
      const type = (await settingsService.get('backupType') ?? 'data') as BackupType;
      const fname = await uploadBackupToDrive(type);
      toast.success(`Uploaded: ${fname}`);
      loadBackups();
    } catch (err: any) {
      toast.error(`Upload failed: ${err?.message ?? err}`);
    } finally { setUploading(false); }
  };

  const handleRestore = async (fileId: string, name: string) => {
    setRestoring(fileId);
    try {
      const b64 = await downloadBackupFromDrive(fileId);
      await restoreBackup(b64);
      toast.success('Restore complete — restarting');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(`Restore failed: ${err?.message ?? err}`);
    } finally { setRestoring(null); }
  };

  if (!isSignedIn()) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left"><DrawerTitle>Drive Backup</DrawerTitle></DrawerHeader>
          <div className="px-4 pb-8 text-center space-y-3">
            <Cloud size={40} className="mx-auto text-muted-foreground" />
            <p className="text-[14px] text-muted-foreground">Connect a Google account first in Google Drive Sync settings</p>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle>Drive Backup</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-4 overflow-y-auto" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>

          {/* Upload button */}
          <button onClick={handleUpload} disabled={uploading}
            className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-[14px] text-white"
            style={{ background: '#2563EB' }}>
            {uploading
              ? <><Loader2 size={18} className="animate-spin" /> Uploading...</>
              : <><Cloud size={18} /> Backup to Drive</>}
          </button>

          {/* Backups list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Drive Backups</p>
              <button onClick={loadBackups} className="p-1.5 rounded-full hover:bg-muted">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} style={{ color: '#6B7280' }} />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
            ) : backups.length === 0 ? (
              <div className="rounded-xl p-4 text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <p className="text-[13px] text-muted-foreground">No backups on Drive yet</p>
              </div>
            ) : (
              backups.map(b => (
                <div key={b.id} className="rounded-xl p-3 flex items-center gap-3"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <Cloud size={18} style={{ color: '#2563EB', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold truncate" style={{ color: '#1A2332' }}>{b.name}</div>
                    <div className="text-[11px]" style={{ color: '#6B7280' }}>{b.date} · {b.size}</div>
                  </div>
                  <button onClick={() => handleRestore(b.id, b.name)} disabled={!!restoring}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                    style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    {restoring === b.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <><Download size={13} /> Restore</>}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default GDriveBackupSheet;
