import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Database, Download, History, Loader2, AlertTriangle, CloudDownload } from 'lucide-react';
import { listDriveBackups, downloadBackupFromDrive } from '@/services/googleDriveService';
import { restoreBackup } from '@/services/backupService';
import { toast } from 'sonner';

interface DriveFile {
  id: string;
  name: string;
  size: string;
  date: string;
}

const GoogleRestoreSheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [files,      setFiles]      = useState<DriveFile[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [restoring,  setRestoring]  = useState(false);
  const [selected,   setSelected]   = useState<DriveFile | null>(null);
  const [confirmRes, setConfirmRes] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const data = await listDriveBackups();
      setFiles(data);
    } catch (err) {
      toast.error('Failed to list backups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchFiles();
  }, [open]);

  const handleStartRestore = (file: DriveFile) => {
    setSelected(file);
    setConfirmRes(true);
  };

  const executeRestore = async () => {
    if (!selected) return;
    setRestoring(true);
    try {
      // 1. Download b64 from Drive
      const b64 = await downloadBackupFromDrive(selected.id);
      
      // 2. Apply restore
      await restoreBackup(b64);
      
      toast.success('Database restored successfully!');
      onOpenChange(false);
      
      // Optionally reload app or redirect to home
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(`Restore failed: ${err?.message ?? err}`);
    } finally {
      setRestoring(false);
      setConfirmRes(false);
    }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left border-b pb-4">
            <DrawerTitle className="flex items-center gap-2">
              <CloudDownload className="text-blue-600" />
              Restore from Google Drive
            </DrawerTitle>
          </DrawerHeader>
          
          <div className="flex flex-col min-h-0">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 size={32} className="animate-spin text-blue-500" />
                <span className="text-sm font-medium text-gray-500">Scanning Drive for backups...</span>
              </div>
            ) : files.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 px-10 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                   <History size={32} className="text-gray-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">No backups found</h3>
                  <p className="text-sm text-gray-500 mt-1">We couldn't find any Medora backup files in your account.</p>
                </div>
                <button onClick={fetchFiles} className="text-blue-600 font-bold text-sm">Refresh list</button>
              </div>
            ) : (
              <div className="overflow-y-auto px-4 py-2 space-y-2 flex-grow" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
                <p className="text-[12px] text-gray-500 px-1 mb-2">Select a version to restore. WARNING: This replaces all current data.</p>
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => handleStartRestore(file)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                      <Database size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold text-gray-900 truncate">{file.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-medium text-gray-500">{file.date}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="text-[11px] font-medium text-gray-500">{file.size}</span>
                      </div>
                    </div>
                    <Download size={18} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmRes} onOpenChange={setConfirmRes}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-2">
               <AlertTriangle size={24} className="text-red-600" />
            </div>
            <AlertDialogTitle>Destructive Action</AlertDialogTitle>
            <AlertDialogDescription>
              Restoring from <span className="font-bold text-gray-900">"{selected?.name}"</span> will permanently delete your current logs and replace them with this version. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <div className="flex gap-2 w-full">
              <button 
                onClick={() => setConfirmRes(false)}
                className="flex-1 h-12 rounded-xl font-bold bg-gray-100 text-gray-700">
                Cancel
              </button>
              <button 
                onClick={executeRestore}
                disabled={restoring}
                className="flex-[2] h-12 rounded-xl font-bold bg-red-600 text-white flex items-center justify-center gap-2">
                {restoring ? <><Loader2 size={18} className="animate-spin" /> Restoring...</> : 'Confirm Restore'}
              </button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default GoogleRestoreSheet;
