import React from 'react';
import { X, Loader2 } from 'lucide-react';

interface AIPromptPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSending?: boolean;
}

const AIPromptPreviewSheet = ({
  open, onOpenChange, prompt, onConfirm, onCancel, isSending = false
}: AIPromptPreviewSheetProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="absolute bottom-0 left-0 right-0 animate-in slide-in-from-bottom duration-300"
        style={{ background: 'var(--card-bg)', borderRadius: '24px 24px 0 0', maxHeight: '80vh',
          display: 'flex', flexDirection: 'column', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border-c)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-c)' }}>
          <span className="text-[16px] font-bold text-foreground">Review Prompt</span>
          <button onClick={onCancel} className="p-2 rounded-full hover:bg-muted/50 transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Prompt content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-xl p-4" style={{ background: 'var(--field-bg)', border: '1px solid var(--border-c)' }}>
            <pre className="text-[12px] leading-relaxed text-muted-foreground whitespace-pre-wrap font-mono">
              {prompt}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pt-3 flex gap-3 flex-shrink-0">
          <button onClick={onCancel}
            className="flex-1 h-12 rounded-xl text-[15px] font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isSending}
            className="flex-1 h-12 rounded-xl text-[15px] font-semibold bg-primary text-primary-foreground disabled:opacity-60 flex items-center justify-center gap-2 transition-colors hover:bg-primary/90">
            {isSending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : 'Send to AI'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIPromptPreviewSheet;
