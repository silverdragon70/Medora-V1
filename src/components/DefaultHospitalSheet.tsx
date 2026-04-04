import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { X } from 'lucide-react';

interface Hospital {
  id: string;
  name: string;
  department?: string;
  unit?: string;
}

interface DefaultHospitalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospitals: Hospital[];
  value: string;
  onApply: (id: string) => void;
}

const DefaultHospitalSheet = ({ open, onOpenChange, hospitals, value, onApply }: DefaultHospitalSheetProps) => {
  const [selected, setSelected] = useState(value);

  const subtitle = (h: Hospital) => {
    const parts = [h.department, h.unit].filter(Boolean);
    return parts.join(' • ') || '';
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) setSelected(value); onOpenChange(o); }}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="flex items-center justify-between px-5 pb-2">
          <DrawerTitle className="text-[17px] font-bold" style={{ color: '#1A2332' }}>Default Hospital</DrawerTitle>
          <DrawerClose asChild>
            <button className="p-1.5 rounded-full hover:bg-muted"><X size={20} style={{ color: '#6B7C93' }} /></button>
          </DrawerClose>
        </DrawerHeader>

        <div className="px-5 pb-6 space-y-3">
          {hospitals.map((h) => {
            const isSelected = selected === h.id;
            return (
              <button
                key={h.id}
                onClick={() => setSelected(h.id)}
                className="w-full flex items-center gap-3 rounded-xl text-left transition-colors"
                style={{
                  padding: '12px 16px',
                  background: isSelected ? '#EFF6FF' : '#F8FAFC',
                  border: `1.5px solid ${isSelected ? '#2563EB' : '#DDE3EA'}`,
                }}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: isSelected ? '#2563EB' : '#CBD5E1' }}
                >
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2563EB' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold truncate" style={{ color: '#1A2332' }}>{h.name}</div>
                  {subtitle(h) && <div className="text-[12px] truncate" style={{ color: '#6B7C93' }}>{subtitle(h)}</div>}
                </div>
              </button>
            );
          })}

          <button
            onClick={() => { onApply(selected); onOpenChange(false); }}
            className="w-full font-bold text-white rounded-xl"
            style={{ height: 48, background: '#2563EB' }}
          >
            Apply
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default DefaultHospitalSheet;
