import React from 'react';
import { Loader2 } from 'lucide-react';

interface AILoadingStateProps {
  title?: string;
  steps?: { text: string; active: boolean }[];
}

const AILoadingState = ({
  title = 'Analyzing case...',
  steps,
}: AILoadingStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 size={32} className="text-primary animate-spin" />
        </div>
      </div>

      <p className="text-[15px] font-semibold text-foreground mb-1">{title}</p>
      <p className="text-[13px] text-muted-foreground mb-6">This may take a moment</p>

      {steps && steps.length > 0 && (
        <div className="w-full max-w-[260px] space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${step.active ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
              <p className={`text-[13px] transition-colors ${step.active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {step.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AILoadingState;
