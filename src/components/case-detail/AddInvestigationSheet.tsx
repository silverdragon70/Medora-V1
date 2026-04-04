import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Image, Trash2, FlaskConical, Scan, ClipboardList } from 'lucide-react';
import { compressImage } from '@/lib/compressImage';

const inputStyle: React.CSSProperties = {
  background: '#F8FAFC', border: '1.5px solid #DDE3EA', borderRadius: '12px',
  padding: '12px 16px', color: '#1A2332', fontSize: '15px', width: '100%',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  color: '#6B7C93', fontSize: '12px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

interface AttachedImage {
  dataUrl: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: { name?: string; type?: string; date?: string; result?: string } | null;
}

const AddInvestigationSheet = ({ open, onClose, onSave, initialData }: Props) => {
  const [name, setName]     = useState('');
  const [type, setType]     = useState('lab');
  const [date, setDate]     = useState('');
  const [result, setResult] = useState('');
  const [images, setImages] = useState<AttachedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = !!initialData;

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setType(initialData.type || 'lab');
      setDate(initialData.date || '');
      setResult(initialData.result || '');
    } else {
      setName(''); setType('lab');
      setDate(new Date().toISOString().split('T')[0]);
      setResult('');
    }
    setImages([]);
  }, [initialData, open]);

  if (!open) return null;

  const handlePickImage = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(async file => {
      const dataUrl = await compressImage(file);
      setImages(prev => [...prev, { dataUrl, name: file.name }]);
    });
    // reset so same file can be picked again
    e.target.value = '';
  };

  const removeImage = (idx: number) =>
    setImages(prev => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    onSave({ name, type, date, result, images });
    onClose();
  };

  const typeLabel = (t: string) => ({ lab: 'Lab Result', imaging: 'Imaging', other: 'Other' }[t] ?? t);

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white animate-in slide-in-from-bottom duration-300"
        style={{ borderRadius: '24px 24px 0 0', maxHeight: '90vh', overflowY: 'auto', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#D1D5DB' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1A2332' }}>
            {isEdit ? 'Edit Investigation' : 'Add Investigation'}
          </span>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X size={20} style={{ color: '#6B7C93' }} />
          </button>
        </div>
        <div style={{ borderTop: '1px solid #DDE3EA' }} />

        {/* Form */}
        <div className="px-5 py-4 space-y-4">

          {/* Name */}
          <div className="space-y-1.5">
            <span style={labelStyle}>Investigation Name</span>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. CBC, Chest X-Ray..."
              style={inputStyle} className="focus:!border-[#2563EB]" />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <span style={labelStyle}>Type</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'lab',     label: 'Lab',     Icon: FlaskConical, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
                { value: 'imaging', label: 'Imaging', Icon: Scan,         color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
                { value: 'other',   label: 'Other',   Icon: ClipboardList, color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
              ].map(t => (
                <button key={t.value} onClick={() => setType(t.value)}
                  style={{
                    padding: '12px 4px', borderRadius: '12px', cursor: 'pointer',
                    border: `1.5px solid ${type === t.value ? t.border : '#DDE3EA'}`,
                    backgroundColor: type === t.value ? t.bg : '#F8FAFC',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    transition: 'all 0.15s',
                  }}>
                  <t.Icon size={16} color={type === t.value ? t.color : '#94A3B8'} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: type === t.value ? t.color : '#6B7C93' }}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <span style={labelStyle}>Date</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={inputStyle} className="focus:!border-[#2563EB]" />
          </div>

          {/* Result */}
          <div className="space-y-1.5">
            <span style={labelStyle}>Result (Text)</span>
            <textarea value={result} onChange={e => setResult(e.target.value)}
              placeholder="Enter findings..." rows={3}
              style={{ ...inputStyle, resize: 'none' }} className="focus:!border-[#2563EB]" />
          </div>

          {/* Image Attach Button */}
          <div className="space-y-2">
            <span style={labelStyle}>Images (optional)</span>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* Picked images preview */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden"
                    style={{ aspectRatio: '1', background: '#F1F5F9' }}>
                    <img src={img.dataUrl} alt={img.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(239,68,68,0.85)' }}>
                      <Trash2 size={11} color="white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add image button */}
            <button
              onClick={handlePickImage}
              className="w-full flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
              style={{ ...inputStyle, border: '1.5px dashed #2563EB', color: '#2563EB', fontWeight: 600 }}>
              <Upload size={16} />
              {images.length > 0 ? `${images.length} image(s) — tap to add more` : 'Attach image (optional)'}
            </button>
          </div>

          {/* Save */}
          <button onClick={handleSave}
            disabled={!name.trim()}
            style={{
              width: '100%', height: 52, borderRadius: 12,
              background: name.trim() ? '#2563EB' : '#D1D5DB',
              color: '#FFFFFF', fontSize: 16, fontWeight: 700, border: 'none',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
            }}>
            {isEdit ? 'Save Changes' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddInvestigationSheet;
