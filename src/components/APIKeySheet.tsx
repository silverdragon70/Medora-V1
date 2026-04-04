import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { X, Eye, EyeOff, AlertTriangle, Trash2 } from 'lucide-react';

interface APIKeySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onSave: (key: string) => void;
  onRemove: () => void;
}

const inputStyle: React.CSSProperties = {
  border: '1.5px solid #DDE3EA',
  borderRadius: 12,
  background: '#F8FAFC',
  height: 48,
  padding: '0 44px 0 14px',
  fontSize: 14,
  color: '#1A2332',
  width: '100%',
  outline: 'none',
};

const APIKeySheet = ({ open, onOpenChange, value, onSave, onRemove }: APIKeySheetProps) => {
  const [key, setKey] = useState(value);
  const [visible, setVisible] = useState(false);

  const maskedKey = key ? key.slice(0, 7) + '••••••••••••' : '';

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) { setKey(value); setVisible(false); } onOpenChange(o); }}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="flex items-center justify-between px-5 pb-2">
          <DrawerTitle className="text-[17px] font-bold" style={{ color: '#1A2332' }}>API Key</DrawerTitle>
          <DrawerClose asChild>
            <button className="p-1.5 rounded-full hover:bg-muted"><X size={20} style={{ color: '#6B7C93' }} /></button>
          </DrawerClose>
        </DrawerHeader>
        <div className="px-5 pb-6 space-y-4">
          <div>
            <label className="text-[12px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#6B7C93' }}>API Key</label>
            <div className="relative">
              <input
                type={visible ? 'text' : 'password'}
                value={visible ? key : maskedKey}
                onChange={e => { setKey(e.target.value); if (!visible) setVisible(true); }}
                placeholder="Enter your API key..."
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#2563EB')}
                onBlur={e => (e.target.style.borderColor = '#DDE3EA')}
              />
              <button
                onClick={() => setVisible(!visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              >
                {visible ? <EyeOff size={18} style={{ color: '#6B7C93' }} /> : <Eye size={18} style={{ color: '#6B7C93' }} />}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: '#FFFBEB' }}>
            <AlertTriangle size={16} style={{ color: '#F59E0B' }} className="flex-shrink-0 mt-0.5" />
            <p className="text-[12px] leading-[18px]" style={{ color: '#92400E' }}>
              Keep your API key private. Never share it with anyone.
            </p>
          </div>

          <button
            onClick={() => { onSave(key); onOpenChange(false); }}
            className="w-full font-bold text-white rounded-xl"
            style={{ height: 48, background: '#2563EB' }}
          >
            Save API Key
          </button>

          {value && (
            <button
              onClick={() => { onRemove(); onOpenChange(false); }}
              className="w-full flex items-center justify-center gap-2 font-bold rounded-xl"
              style={{ height: 48, background: '#fff', border: '1.5px solid #FCA5A5', color: '#EF4444' }}
            >
              <Trash2 size={16} /> Remove API Key
            </button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default APIKeySheet;
