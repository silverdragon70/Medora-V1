import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { X, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface SyncProgressSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onComplete?: (timestamp: string) => void;
}

type State = 'running' | 'success' | 'error';

const steps = [
  { percent: 10, message: 'Connecting to Google Drive...' },
  { percent: 30, message: 'Checking for changes...' },
  { percent: 50, message: 'Uploading new records...' },
  { percent: 75, message: 'Uploading images...' },
  { percent: 90, message: 'Verifying upload...' },
  { percent: 100, message: 'Complete' },
];

const SyncProgressSheet = ({ open, onOpenChange, email, onComplete }: SyncProgressSheetProps) => {
  const [state, setState] = useState<State>('running');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [completedTime, setCompletedTime] = useState('');
  const cancelledRef = useRef(false);

  const runSimulation = useCallback(() => {
    setState('running');
    setProgress(0);
    cancelledRef.current = false;
    let stepIndex = 0;

    const runStep = () => {
      if (cancelledRef.current || stepIndex >= steps.length) return;
      const step = steps[stepIndex];
      setStatusMessage(step.message);
      const startPercent = stepIndex === 0 ? 0 : steps[stepIndex - 1].percent;
      const endPercent = step.percent;
      const duration = 500 + Math.random() * 500;
      const startTime = Date.now();

      const animate = () => {
        if (cancelledRef.current) return;
        const t = Math.min((Date.now() - startTime) / duration, 1);
        setProgress(Math.round(startPercent + (endPercent - startPercent) * t * (2 - t)));
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          stepIndex++;
          if (stepIndex < steps.length) {
            setTimeout(runStep, 200);
          } else {
            const now = new Date();
            const timeStr = `Today · ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            setCompletedTime(timeStr);
            setState('success');
            onComplete?.(now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + now.toTimeString().slice(0, 5));
          }
        }
      };
      requestAnimationFrame(animate);
    };
    setTimeout(runStep, 300);
  }, [onComplete]);

  useEffect(() => {
    if (open) runSimulation();
    return () => { cancelledRef.current = true; };
  }, [open, runSimulation]);

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
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, background: '#2563EB', transition: 'width 0.1s linear' }} />
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
                <div className="text-[13px] mb-6" style={{ color: '#6B7C93' }}>{statusMessage}</div>
                <button
                  onClick={runSimulation}
                  className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white text-[14px] mb-3"
                  style={{ height: 48, background: '#2563EB' }}
                >
                  <RefreshCw size={16} /> Try Again
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-full rounded-xl font-bold text-white text-[14px]"
                  style={{ height: 48, background: '#2563EB' }}
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
