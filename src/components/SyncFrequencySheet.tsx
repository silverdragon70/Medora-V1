import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { X } from 'lucide-react';

const frequencies = [
  { id: 'hourly', label: 'Every hour' },
  { id: '6hours', label: 'Every 6 hours' },
  { id: 'daily', label: 'Daily', subtitle: 'Recommended' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'manual', label: 'Manual only', subtitle: 'Sync only when I tap "Sync Now"' },
];

interface SyncFrequencySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onApply: (value: string) => void;
}

const SyncFrequencySheet = ({ open, onOpenChange, value, onApply }: SyncFrequencySheetProps) => {
  const [selected, setSelected] = useState(value);

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) setSelected(value); onOpenChange(o); }}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="flex items-center justify-between px-5 pb-2">
          <DrawerTitle className="text-[17px] font-bold" style={{ color: '#1A2332' }}>Sync Frequency</DrawerTitle>
          <DrawerClose asChild>
            <button className="p-1.5 rounded-full hover:bg-muted"><X size={20} style={{ color: '#6B7C93' }} /></button>
          </DrawerClose>
        </DrawerHeader>
        <div className="px-5 pb-6 space-y-3">
          {frequencies.map((f) => {
            const isSelected = selected === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSelected(f.id)}
                className="w-full flex items-center gap-3 rounded-xl text-left transition-colors"
                style={{ padding: '12px 16px', background: isSelected ? '#EFF6FF' : '#F8FAFC', border: `1.5px solid ${isSelected ? '#2563EB' : '#DDE3EA'}` }}
              >
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: isSelected ? '#2563EB' : '#CBD5E1' }}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2563EB' }} />}
                </div>
                <div className="flex-1">
                  <div className="text-[14px] font-bold" style={{ color: '#1A2332' }}>{f.label}</div>
                  {f.subtitle && <div className="text-[12px]" style={{ color: '#6B7C93' }}>{f.subtitle}</div>}
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

export default SyncFrequencySheet;
