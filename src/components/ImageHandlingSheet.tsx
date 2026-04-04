import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { X } from 'lucide-react';

type ImageQuality = 'compress' | 'original';
type MaxSize = '1' | '5' | '10' | 'none';

interface ImageHandlingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (quality: ImageQuality, maxSize: MaxSize) => void;
}

const qualityOptions: { id: ImageQuality; label: string; subtitle: string }[] = [
  { id: 'compress', label: 'Auto Compress', subtitle: 'Reduce image size automatically on upload' },
  { id: 'original', label: 'Keep Original Quality', subtitle: 'Store images as captured (uses more storage)' },
];

const sizeOptions: { id: MaxSize; label: string; recommended?: boolean }[] = [
  { id: '1', label: '1 MB per image' },
  { id: '5', label: '5 MB per image', recommended: true },
  { id: '10', label: '10 MB per image' },
  { id: 'none', label: 'No limit' },
];

const RadioDot = ({ selected }: { selected: boolean }) => (
  <div
    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
    style={{ borderColor: selected ? '#2563EB' : '#CBD5E1' }}
  >
    {selected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2563EB' }} />}
  </div>
);

const ImageHandlingSheet = ({ open, onOpenChange, onApply }: ImageHandlingSheetProps) => {
  const [quality, setQuality] = useState<ImageQuality>('original');
  const [maxSize, setMaxSize] = useState<MaxSize>('5');

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) { setQuality('original'); setMaxSize('5'); } onOpenChange(o); }}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="flex items-center justify-between px-5 pb-2">
          <DrawerTitle className="text-[17px] font-bold" style={{ color: '#1A2332' }}>Image Handling</DrawerTitle>
          <DrawerClose asChild>
            <button className="p-1.5 rounded-full hover:bg-muted"><X size={20} style={{ color: '#6B7C93' }} /></button>
          </DrawerClose>
        </DrawerHeader>

        <div className="px-5 pb-8 space-y-5 overflow-y-auto">
          {/* Loading Style */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#6B7C93' }}>Loading Style</h4>
            <div
              className="p-4 rounded-xl"
              style={{ background: '#EFF6FF', border: '1.5px solid #2563EB' }}
            >
              <div className="flex items-center gap-3">
                <RadioDot selected />
                <div>
                  <div className="text-[14px] font-bold" style={{ color: '#1A2332' }}>Lazy Load</div>
                  <div className="text-[12px]" style={{ color: '#6B7C93' }}>Images load only when visible on screen</div>
                  <div className="text-[12px] font-medium" style={{ color: '#2563EB' }}>(Recommended)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t" style={{ borderColor: '#F0F4F8' }} />

          {/* Image Quality */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#6B7C93' }}>Image Quality</h4>
            <div className="space-y-2.5">
              {qualityOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setQuality(opt.id)}
                  className="w-full text-left p-4 rounded-xl transition-all"
                  style={{
                    background: quality === opt.id ? '#EFF6FF' : '#F8FAFC',
                    border: `1.5px solid ${quality === opt.id ? '#2563EB' : '#DDE3EA'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <RadioDot selected={quality === opt.id} />
                    <div>
                      <div className="text-[14px] font-bold" style={{ color: '#1A2332' }}>{opt.label}</div>
                      <div className="text-[12px]" style={{ color: '#6B7C93' }}>{opt.subtitle}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t" style={{ borderColor: '#F0F4F8' }} />

          {/* Max Image Size */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#6B7C93' }}>Max Image Size</h4>
            <div className="space-y-2.5">
              {sizeOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setMaxSize(opt.id)}
                  className="w-full text-left p-4 rounded-xl transition-all"
                  style={{
                    background: maxSize === opt.id ? '#EFF6FF' : '#F8FAFC',
                    border: `1.5px solid ${maxSize === opt.id ? '#2563EB' : '#DDE3EA'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <RadioDot selected={maxSize === opt.id} />
                    <div>
                      <div className="text-[14px] font-bold" style={{ color: '#1A2332' }}>{opt.label}</div>
                      {opt.recommended && (
                        <div className="text-[12px] font-medium" style={{ color: '#2563EB' }}>Recommended</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Apply */}
          <button
            onClick={() => { onApply(quality, maxSize); onOpenChange(false); }}
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

export default ImageHandlingSheet;
