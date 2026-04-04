import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { X } from 'lucide-react';

const models = [
  { id: 'sonnet', label: 'Claude Sonnet', subtitle: 'Best balance of speed and quality (Recommended)' },
  { id: 'opus', label: 'Claude Opus', subtitle: 'Most powerful, slower' },
  { id: 'haiku', label: 'Claude Haiku', subtitle: 'Fastest, lightweight' },
];

interface AIModelSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onApply: (value: string) => void;
}

const AIModelSheet = ({ open, onOpenChange, value, onApply }: AIModelSheetProps) => {
  const [selected, setSelected] = useState(value);

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) setSelected(value); onOpenChange(o); }}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="flex items-center justify-between px-5 pb-2">
          <DrawerTitle className="text-[17px] font-bold" style={{ color: '#1A2332' }}>AI Model</DrawerTitle>
          <DrawerClose asChild>
            <button className="p-1.5 rounded-full hover:bg-muted"><X size={20} style={{ color: '#6B7C93' }} /></button>
          </DrawerClose>
        </DrawerHeader>
        <div className="px-5 pb-6 space-y-3">
          {models.map((m) => {
            const isSelected = selected === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className="w-full flex items-center gap-3 rounded-xl text-left transition-colors"
                style={{ padding: '12px 16px', background: isSelected ? '#EFF6FF' : '#F8FAFC', border: `1.5px solid ${isSelected ? '#2563EB' : '#DDE3EA'}` }}
              >
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: isSelected ? '#2563EB' : '#CBD5E1' }}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2563EB' }} />}
                </div>
                <div className="flex-1">
                  <div className="text-[14px] font-bold" style={{ color: '#1A2332' }}>{m.label}</div>
                  {m.subtitle && <div className="text-[12px]" style={{ color: '#6B7C93' }}>{m.subtitle}</div>}
                </div>
              </button>
            );
          })}
          <button onClick={() => { onApply(selected); onOpenChange(false); }} className="w-full font-bold text-white rounded-xl" style={{ height: 48, background: '#2563EB' }}>Apply</button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AIModelSheet;
