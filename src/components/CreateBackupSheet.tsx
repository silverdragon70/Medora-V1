import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Database, Download, Share2, Loader2 } from 'lucide-react';
import { settingsService } from '@/services/settingsService';
import { prepareBackup, saveBackupToDownloads, shareBackupFile } from '@/services/backupService';
import type { BackupType } from '@/services/backupService';
import { toast } from 'sonner';

interface CreateBackupSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onBackupComplete?: () => void;
}

const CreateBackupSheet = ({ open, onOpenChange, onBackupComplete }: CreateBackupSheetProps) => {
  const [lastDate,  setLastDate]  = useState('');
  const [lastSize,  setLastSize]  = useState('');
  const [preparing, setPreparing] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [pendingFile, setPendingFile] = useState<{ uri: string; b64: string; fname: string; sizeMB: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      settingsService.get('lastBackupDate'),
      settingsService.get('lastBackupSize'),
    ]).then(([d, s]) => { setLastDate(d ?? ''); setLastSize(s ?? ''); });
  }, [open]);

  const handlePrepare = async () => {
    setPreparing(true);
    try {
      const type = (await settingsService.get('backupType') ?? 'data') as BackupType;
      const result = await prepareBackup(type);
      setPendingFile(result);
    } catch (err: any) {
      toast.error(`Backup failed: ${err?.message ?? err}`);
    } finally { setPreparing(false); }
  };

  const handleSaveToDownloads = async () => {
    if (!pendingFile) return;
    setSaving(true);
    try {
      await saveBackupToDownloads(pendingFile.b64, pendingFile.fname, pendingFile.sizeMB);
      const [d, s] = await Promise.all([
        settingsService.get('lastBackupDate'),
        settingsService.get('lastBackupSize'),
      ]);
      setLastDate(d ?? ''); setLastSize(s ?? '');
      setPendingFile(null);
      onBackupComplete?.();
      onOpenChange(false);
      toast.success('Backup saved to Downloads');
    } catch (err: any) {
      toast.error(`Save failed: ${err?.message ?? err}`);
    } finally { setSaving(false); }
  };

  const handleShare = async () => {
    if (!pendingFile) return;
    try {
      await shareBackupFile(pendingFile.uri, pendingFile.fname, pendingFile.sizeMB);
      const [d, s] = await Promise.all([
        settingsService.get('lastBackupDate'),
        settingsService.get('lastBackupSize'),
      ]);
      setLastDate(d ?? ''); setLastSize(s ?? '');
      setPendingFile(null);
      onBackupComplete?.();
      onOpenChange(false);
    } catch { /* user cancelled */ }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Create Backup</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 space-y-4" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>

            {/* Last backup info */}
            {lastDate ? (
              <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <Database size={18} style={{ color: '#16A34A' }} />
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: '#15803D' }}>Last Backup</div>
                  <div className="text-[12px]" style={{ color: '#16A34A' }}>{lastDate} · {lastSize}</div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#FEF9C3', border: '1px solid #FDE047' }}>
                <Database size={18} style={{ color: '#CA8A04' }} />
                <div className="text-[13px] font-semibold" style={{ color: '#854D0E' }}>No backup yet</div>
              </div>
            )}

            <p className="text-[13px] text-muted-foreground text-center">
              Backup type can be configured in <span className="font-semibold text-foreground">Backup Settings</span>
            </p>

            <button onClick={handlePrepare} disabled={preparing}
              className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-[15px] text-white"
              style={{ background: '#2563EB' }}>
              {preparing ? <><Loader2 size={18} className="animate-spin" /> Preparing...</> : <><Database size={18} /> Create Backup</>}
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Save / Share dialog */}
      <AlertDialog open={!!pendingFile} onOpenChange={o => { if (!o) setPendingFile(null); }}>
        <AlertDialogContent className="max-w-[300px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-[16px]">Save Backup</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 px-2 pb-2">
            <button onClick={handleSaveToDownloads} disabled={saving}
              className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-[14px] text-white active:scale-95"
              style={{ background: '#2563EB' }}>
              <Download size={18} />{saving ? 'Saving...' : 'Save to Downloads'}
            </button>
            <button onClick={handleShare}
              className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-[14px] active:scale-95"
              style={{ background: '#F1F5F9', color: '#1A2332', border: '1.5px solid #E2E8F0' }}>
              <Share2 size={18} />Share / Send
            </button>
            <AlertDialogCancel className="w-full h-10 rounded-xl text-[13px]" onClick={() => setPendingFile(null)}>
              Cancel
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CreateBackupSheet;
