import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import { compressImage } from '@/lib/compressImage';

const inputStyle: React.CSSProperties = {
  background: '#F8FAFC', border: '1.5px solid #DDE3EA', borderRadius: '12px',
  padding: '12px 16px', color: '#1A2332', fontSize: '15px', width: '100%', outline: 'none',
};

const labelStyle: React.CSSProperties = {
  color: '#6B7C93', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
};

const respiratoryOptions = ['Room Air', 'Nasal O₂', 'Mask', 'HFNC', 'CPAP', 'MV'];
const feedingOptions = ['NPO', 'Nasogastric', 'Oral'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: { id?: string; type?: string; content?: string; medications?: string; mode?: string; details?: string; existingImages?: string[] } | null;
}

const AddManagementSheet = ({ open, onClose, onSave, initialData }: Props) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [medications, setMedications] = useState('');
  const [respMode, setRespMode] = useState('');
  const [respDetails, setRespDetails] = useState('');
  const [feedMode, setFeedMode] = useState('');
  const [feedDetails, setFeedDetails] = useState('');
  const [chartImages, setChartImages] = useState<{ dataUrl: string; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = !!initialData;

  useEffect(() => {
    if (initialData) {
      // Normalize type from DB (lowercase) to display format
      const normalizeType = (t?: string) => {
        if (!t) return null;
        if (t === 'medication' || t === 'Medications') return 'Medications';
        if (t === 'respiratory' || t === 'Respiratory Support') return 'Respiratory Support';
        if (t === 'feeding' || t === 'Feeding') return 'Feeding';
        return t;
      };
      const type = normalizeType(initialData.type);
      setSelectedType(type);
      if (type === 'Medications') {
        // content field from DB has medications as newline-separated text
        setMedications((initialData as any).content || initialData.medications || '');
      } else if (type === 'Respiratory Support') {
        setRespMode(initialData.mode || '');
        setRespDetails(initialData.details || '');
      } else if (type === 'Feeding') {
        setFeedMode(initialData.mode || '');
        setFeedDetails(initialData.details || '');
      }
    } else {
      setSelectedType(null); setMedications(''); setRespMode(''); setRespDetails(''); setFeedMode(''); setFeedDetails('');
      setChartImages([]);
    }
    // Load existing images when editing
    if (initialData?.existingImages && initialData.existingImages.length > 0) {
      setChartImages(initialData.existingImages.map((url, i) => ({ dataUrl: url, name: `existing_${i}` })));
    }
  }, [initialData, open]);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(async file => {
      const dataUrl = await compressImage(file);
      setChartImages(prev => [...prev, { dataUrl, name: file.name }]);
    });
    e.target.value = '';
  };

  const handleSave = () => {
    if (selectedType === 'Medications') onSave({ type: 'Medications', medications, images: chartImages });
    else if (selectedType === 'Respiratory Support') onSave({ type: 'Respiratory Support', mode: respMode, details: respDetails, images: chartImages });
    else if (selectedType === 'Feeding') onSave({ type: 'Feeding', mode: feedMode, details: feedDetails, images: chartImages });
    setChartImages([]);
    resetAndClose();
  };

  const resetAndClose = () => {
    setSelectedType(null); setMedications(''); setRespMode(''); setRespDetails(''); setFeedMode(''); setFeedDetails('');
    onClose();
  };

  const title = isEdit
    ? `Edit ${selectedType || 'Management'}`
    : 'Add Management';

  const PillGrid = ({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (v: string) => void }) => (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} onClick={() => onSelect(opt)}
          style={{
            padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, border: 'none',
            background: selected === opt ? '#2563EB' : '#F1F5F9',
            color: selected === opt ? '#FFFFFF' : '#1A2332',
          }}>
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={resetAndClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white animate-in slide-in-from-bottom duration-300"
        style={{ borderRadius: '24px 24px 0 0', maxHeight: '85vh', overflow: 'auto', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#D1D5DB' }} />
        </div>
        <div className="flex items-center justify-between px-5 pb-3">
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#1A2332' }}>{title}</span>
          <button onClick={resetAndClose} className="p-2 rounded-full hover:bg-muted/50">
            <X size={20} style={{ color: '#6B7C93' }} />
          </button>
        </div>
        <div style={{ borderTop: '1px solid #DDE3EA' }} />

        <div className="px-5 py-4 space-y-4">
          {!selectedType ? (
            <>
              <span style={{ ...labelStyle, fontSize: '13px' }}>Select type:</span>
              {[
                { type: 'Medications', icon: '💊' },
                { type: 'Respiratory Support', icon: '🫁' },
                { type: 'Feeding', icon: '🍼' },
              ].map(({ type, icon }) => (
                <button key={type} onClick={() => setSelectedType(type)}
                  className="w-full flex items-center gap-3 hover:bg-muted/30 transition-colors"
                  style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid #DDE3EA', background: '#FFFFFF' }}>
                  <span style={{ fontSize: '20px' }}>{icon}</span>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#1A2332' }}>{type}</span>
                </button>
              ))}
            </>
          ) : (
            <>
              {!isEdit && (
                <button onClick={() => setSelectedType(null)} style={{ fontSize: '13px', color: '#2563EB', fontWeight: 600 }}>
                  ← Back to types
                </button>
              )}

              {selectedType === 'Medications' && (
                <>
                  <div className="space-y-1.5">
                    <span style={labelStyle}>Medications List</span>
                    <textarea value={medications} onChange={e => setMedications(e.target.value)}
                      placeholder="Type medications here..." rows={4}
                      style={{ ...inputStyle, resize: 'none' }} className="focus:!border-[#2563EB]" />
                  </div>
                  {/* Hidden file input */}
                  <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
                  {/* Image previews */}
                  {chartImages.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {chartImages.map((img, i) => (
                        <div key={i} style={{ position: 'relative', width: 64, height: 64, borderRadius: 10, overflow: 'hidden' }}>
                          <img src={img.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => setChartImages(p => p.filter((_, j) => j !== i))}
                            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <Trash2 size={10} color="white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 hover:opacity-90"
                    style={{ ...inputStyle, border: '1.5px dashed #2563EB', color: '#2563EB', fontWeight: 600 }}>
                    <Upload size={16} /> {chartImages.length > 0 ? `${chartImages.length} chart(s) — add more` : 'Attach chart (optional)'}
                  </button>
                </>
              )}

              {selectedType === 'Respiratory Support' && (
                <>
                  <PillGrid options={respiratoryOptions} selected={respMode} onSelect={setRespMode} />
                  <div className="space-y-1.5">
                    <span style={labelStyle}>Details</span>
                    <input value={respDetails} onChange={e => setRespDetails(e.target.value)}
                      placeholder="Flow rate / FiO₂..." style={inputStyle} className="focus:!border-[#2563EB]" />
                  </div>
                </>
              )}

              {selectedType === 'Feeding' && (
                <>
                  <PillGrid options={feedingOptions} selected={feedMode} onSelect={setFeedMode} />
                  <div className="space-y-1.5">
                    <span style={labelStyle}>Feeding Details</span>
                    <textarea value={feedDetails} onChange={e => setFeedDetails(e.target.value)}
                      placeholder="60 mL/hr, formula..." rows={3}
                      style={{ ...inputStyle, resize: 'none' }} className="focus:!border-[#2563EB]" />
                  </div>
                </>
              )}

              <button onClick={handleSave}
                style={{ width: '100%', height: '52px', borderRadius: '12px', background: '#2563EB', color: '#FFFFFF', fontSize: '16px', fontWeight: 700, border: 'none' }}>
                {isEdit ? 'Save Changes' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddManagementSheet;
