import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { FolderOpen, Loader2, AlertTriangle } from 'lucide-react';
import { restoreBackup } from '@/services/backupService';
import { toast } from 'sonner';

const RestoreBackupSheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [fileName,    setFileName]    = useState('');
  const [fileContent, setFileContent] = useState('');
  const [confirm,     setConfirm]     = useState(false);
  const [restoring,   setRestoring]   = useState(false);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.medora')) {
      toast.error('Invalid file — please select a .medora backup file');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      // content is base64 data URL — strip prefix
      const b64 = content.split(',')[1];
      setFileContent(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restoreBackup(fileContent);
      toast.success('Restore complete — restarting app');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(`Restore failed: ${err?.message ?? err}`);
    } finally { setRestoring(false); setConfirm(false); }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Restore Backup</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 space-y-4" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>

            {/* Warning */}
            <div className="rounded-xl p-3 flex items-start gap-3" style={{ background: '#FEF9C3', border: '1px solid #FDE047' }}>
              <AlertTriangle size={18} style={{ color: '#CA8A04', flexShrink: 0, marginTop: 2 }} />
              <p className="text-[13px]" style={{ color: '#854D0E' }}>
                Restoring will replace all current data. This action cannot be undone.
              </p>
            </div>

            {/* File picker */}
            <div>
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Select Backup File</p>
              <label className="w-full h-24 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                style={{ background: '#F8FAFC', border: '2px dashed #DDE3EA' }}>
                <FolderOpen size={24} style={{ color: '#6B7280' }} />
                <span className="text-[13px]" style={{ color: fileName ? '#1A2332' : '#9CA3AF' }}>
                  {fileName || 'Tap to select .medora file'}
                </span>
                <input type="file" accept=".medora" className="hidden" onChange={handleFilePick} />
              </label>
            </div>

            <button
              onClick={() => setConfirm(true)}
              disabled={!fileContent || restoring}
              className="w-full h-12 rounded-xl font-semibold text-[15px] text-white transition-all"
              style={{ background: fileContent ? '#2563EB' : '#CBD5E1' }}>
              Restore Backup
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from backup?</AlertDialogTitle>
            <AlertDialogDescription>
              All current data will be replaced with the backup. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} className="bg-destructive text-destructive-foreground">
              {restoring ? <Loader2 size={16} className="animate-spin" /> : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RestoreBackupSheet;
