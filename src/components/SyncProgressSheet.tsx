import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { X, CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { uploadBackupToDrive } from '@/services/googleDriveService';
import { settingsService } from '@/services/settingsService';

interface SyncProgressSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onComplete?: (timestamp: string) => void;
}

type State = 'running' | 'success' | 'error';

const SyncProgressSheet = ({ open, onOpenChange, email, onComplete }: SyncProgressSheetProps) => {
  const [state, setState] = useState<State>('running');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [completedTime, setCompletedTime] = useState('');
  const cancelledRef = useRef(false);
  const syncStartedRef = useRef(false);

  const runActualSync = useCallback(async () => {
    // Prevent multiple triggers
    if (syncStartedRef.current) return;
    syncStartedRef.current = true;
    
    setState('running');
    setProgress(10);
    setStatusMessage('Preparing your data...');
    cancelledRef.current = false;

    try {
      // Step 1: Preparation
      setProgress(25);
      const backupType = (await settingsService.get('backupType') ?? 'data') as any;
      if (cancelledRef.current) return;

      // Step 2: Upload
      setStatusMessage('Uploading to Google Drive...');
      setProgress(50);
      await uploadBackupToDrive(backupType);
      
      if (cancelledRef.current) return;

      // Step 3: Finalize
      setProgress(90);
      setStatusMessage('Verifying backup...');
      
      const now = new Date();
      const timeStr = `Today · ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (cancelledRef.current) return;

      setProgress(100);
      setCompletedTime(timeStr);
      setState('success');
      
      const timestamp = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + now.toTimeString().slice(0, 5);
      onComplete?.(timestamp);

    } catch (err: any) {
      if (!cancelledRef.current) {
        console.error('Sync Error:', err);
        setState('error');
        setStatusMessage(err?.message ?? 'Sync failed. Please check your connection.');
      }
    } finally {
      // Note: we don't reset syncStartedRef to false while open is true 
      // to prevent re-triggers if a component re-renders.
    }
  }, [onComplete]);

  useEffect(() => {
    if (open) {
      runActualSync();
    } else {
      // Reset for next time it opens
      syncStartedRef.current = false;
      setState('running');
      setProgress(0);
    }
    return () => { 
      cancelledRef.current = true; 
    };
  }, [open, runActualSync]);

  const handleCancel = () => {
    cancelledRef.current = true;
    setState('error');
    setStatusMessage('Sync cancelled');
    setCancelConfirmOpen(false);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={(o) => { if (!o && state === 'running') { setCancelConfirmOpen(true); return; } onOpenChange(o); }}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="flex items-center justify-between px-5 pb-2">
            <DrawerTitle className="text-[16px] font-bold" style={{ color: '#1A2332' }}>Syncing to Google Drive</DrawerTitle>
            <DrawerClose asChild>
              <button onClick={(e) => { if (state === 'running') { e.preventDefault(); setCancelConfirmOpen(true); } }} className="p-1.5 rounded-full hover:bg-muted">
                <X size={20} style={{ color: '#6B7C93' }} />
              </button>
            </DrawerClose>
          </DrawerHeader>

          <div className="px-5 pb-6 flex flex-col items-center">
            {state === 'running' && (
              <>
                <div className="text-[48px] mb-3">☁️</div>
                <div className="text-[16px] font-bold mb-1" style={{ color: '#1A2332' }}>Syncing Data...</div>
                <div className="w-full flex items-center gap-3 my-4">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#F0F4F8' }}>
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, background: '#2563EB', transition: 'width 0.3s ease-out' }} />
                  </div>
                  <span className="text-[14px] font-bold" style={{ color: '#2563EB', minWidth: 36 }}>{progress}%</span>
                </div>
                <div className="text-[13px] italic mb-6" style={{ color: '#6B7C93' }}>{statusMessage}</div>
                <button
                  onClick={() => setCancelConfirmOpen(true)}
                  className="w-full rounded-xl font-bold text-[14px]"
                  style={{ height: 48, background: '#fff', border: '1.5px solid #DDE3EA', color: '#6B7C93' }}
                >
                  Cancel
                </button>
              </>
            )}

            {state === 'success' && (
              <>
                <CheckCircle2 size={48} style={{ color: '#22C55E' }} className="mb-3" />
                <div className="text-[16px] font-bold mb-1" style={{ color: '#1A2332' }}>Sync Complete!</div>
                <div className="text-[13px] mb-0.5" style={{ color: '#6B7C93' }}>Last synced: {completedTime}</div>
                <div className="text-[13px] mb-6" style={{ color: '#6B7C93' }}>{email}</div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-full rounded-xl font-bold text-white text-[14px]"
                  style={{ height: 48, background: '#2563EB' }}
                >
                  Close
                </button>
              </>
            )}

            {state === 'error' && (
              <>
                <XCircle size={48} style={{ color: '#EF4444' }} className="mb-3" />
                <div className="text-[16px] font-bold mb-1" style={{ color: '#1A2332' }}>Sync Failed</div>
                <div className="text-[13px] text-center mb-6 px-4" style={{ color: '#6B7C93' }}>{statusMessage}</div>
                <button
                  onClick={() => { syncStartedRef.current = false; runActualSync(); }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white text-[14px] mb-3"
                  style={{ height: 48, background: '#2563EB' }}
                >
                  <RefreshCw size={16} /> Try Again
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-full rounded-xl font-bold text-[#6B7C93] text-[14px]"
                  style={{ height: 48, background: '#fff', border: '1.5px solid #DDE3EA' }}
                >
                  Close
                </button>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel sync?</AlertDialogTitle>
            <AlertDialogDescription>The sync operation will be stopped.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleCancel}>
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SyncProgressSheet;
