import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { X, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export type OperationType = 'backup' | 'export' | 'restore';
type ProgressState = 'running' | 'success' | 'error';

interface ProgressStep {
  percent: number;
  message: string;
}

const operationConfig: Record<OperationType, {
  title: string;
  icon: string;
  runningLabel: string;
  successMessage: string;
  steps: ProgressStep[];
}> = {
  backup: {
    title: 'Creating Backup',
    icon: '🗄️',
    runningLabel: 'Creating Full Backup...',
    successMessage: 'Backup saved successfully',
    steps: [
      { percent: 10, message: 'Preparing data...' },
      { percent: 30, message: 'Exporting database...' },
      { percent: 60, message: 'Packaging images...' },
      { percent: 85, message: 'Saving file...' },
      { percent: 100, message: 'Complete' },
    ],
  },
  export: {
    title: 'Exporting Data',
    icon: '📤',
    runningLabel: 'Exporting Data...',
    successMessage: 'Export ready',
    steps: [
      { percent: 10, message: 'Querying records...' },
      { percent: 40, message: 'Generating file...' },
      { percent: 80, message: 'Saving file...' },
      { percent: 100, message: 'Complete' },
    ],
  },
  restore: {
    title: 'Restoring Backup',
    icon: '⬇️',
    runningLabel: 'Restoring Backup...',
    successMessage: 'Data restored successfully',
    steps: [
      { percent: 10, message: 'Reading backup file...' },
      { percent: 30, message: 'Validating data...' },
      { percent: 60, message: 'Restoring database...' },
      { percent: 85, message: 'Restoring images...' },
      { percent: 100, message: 'Complete' },
    ],
  },
};

interface ProgressSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: OperationType;
  detail?: string;
  onComplete?: () => void;
  onRetry?: () => void;
}

const ProgressSheet = ({ open, onOpenChange, type, detail, onComplete, onRetry }: ProgressSheetProps) => {
  const [state, setState] = useState<ProgressState>('running');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const cancelledRef = useRef(false);
  const config = operationConfig[type];

  const runSimulation = useCallback(() => {
    setState('running');
    setProgress(0);
    cancelledRef.current = false;

    const steps = config.steps;
    let stepIndex = 0;

    const runStep = () => {
      if (cancelledRef.current || stepIndex >= steps.length) return;
      const step = steps[stepIndex];
      setStatusMessage(step.message);

      const startPercent = stepIndex === 0 ? 0 : steps[stepIndex - 1].percent;
      const endPercent = step.percent;
      const duration = 600 + Math.random() * 400;
      const startTime = Date.now();

      const animate = () => {
        if (cancelledRef.current) return;
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = t * (2 - t);
        setProgress(Math.round(startPercent + (endPercent - startPercent) * eased));

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          stepIndex++;
          if (stepIndex < steps.length) {
            setTimeout(runStep, 200);
          } else {
            setState('success');
            onComplete?.();
          }
        }
      };
      requestAnimationFrame(animate);
    };

    setTimeout(runStep, 300);
  }, [config.steps, onComplete]);

  useEffect(() => {
    if (open) {
      runSimulation();
    }
    return () => { cancelledRef.current = true; };
  }, [open, runSimulation]);

  const handleCancel = () => {
    cancelledRef.current = true;
    setState('error');
    setStatusMessage('Operation cancelled');
    setCancelConfirmOpen(false);
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      runSimulation();
    }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={(o) => { if (!o && state === 'running') { setCancelConfirmOpen(true); return; } onOpenChange(o); }}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="flex items-center justify-between px-5 pb-2">
            <DrawerTitle className="text-[16px] font-bold" style={{ color: '#1A2332' }}>{config.title}</DrawerTitle>
            <DrawerClose asChild>
              <button onClick={(e) => { if (state === 'running') { e.preventDefault(); setCancelConfirmOpen(true); } }} className="p-1.5 rounded-full hover:bg-muted">
                <X size={20} style={{ color: '#6B7C93' }} />
              </button>
            </DrawerClose>
          </DrawerHeader>

          <div className="px-5 pb-6 flex flex-col items-center">
            {state === 'running' && (
              <>
                <div className="text-[48px] mb-3">{config.icon}</div>
                <div className="text-[16px] font-bold mb-1" style={{ color: '#1A2332' }}>{config.runningLabel}</div>

                <div className="w-full flex items-center gap-3 my-4">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#F0F4F8' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${progress}%`, background: '#2563EB', transition: 'width 0.1s linear' }}
                    />
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
                <div className="text-[16px] font-bold mb-1" style={{ color: '#1A2332' }}>Done!</div>
                <div className="text-[14px] mb-1" style={{ color: '#1A2332' }}>{config.successMessage}</div>
                {detail && <div className="text-[13px] mb-6" style={{ color: '#6B7C93' }}>{detail}</div>}
                {!detail && <div className="mb-6" />}

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
                <div className="text-[16px] font-bold mb-1" style={{ color: '#1A2332' }}>Something went wrong</div>
                <div className="text-[13px] mb-6" style={{ color: '#6B7C93' }}>{statusMessage}</div>

                <button
                  onClick={handleRetry}
                  className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white text-[14px] mb-3"
                  style={{ height: 48, background: '#2563EB' }}
                >
                  <RefreshCw size={16} /> Try Again
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-full rounded-xl font-bold text-[14px]"
                  style={{ height: 48, background: '#2563EB', color: '#fff' }}
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
            <AlertDialogTitle>Cancel this operation?</AlertDialogTitle>
            <AlertDialogDescription>The operation will be stopped and any partial progress will be discarded.</AlertDialogDescription>
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

export default ProgressSheet;
