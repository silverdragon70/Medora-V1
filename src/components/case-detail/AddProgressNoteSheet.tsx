import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const inputStyle: React.CSSProperties = {
  background: '#F8FAFC', border: '1.5px solid #DDE3EA', borderRadius: '12px',
  padding: '12px 16px', color: '#1A2332', fontSize: '15px', width: '100%', outline: 'none',
};

const labelStyle: React.CSSProperties = {
  color: '#6B7C93', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: {
    date?: string; assessment?: string;
    vitals?: { hr?: string; spo2?: string; temp?: string; rr?: string; bp?: string; weight?: string };
  } | null;
}

const AddProgressNoteSheet = ({ open, onClose, onSave, initialData }: Props) => {
  const [date, setDate] = useState('');
  const [assessment, setAssessment] = useState('');
  const [hr, setHr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [temp, setTemp] = useState('');
  const [rr, setRr] = useState('');
  const [bp, setBp] = useState('');
  const [weight, setWeight] = useState('');
  const isEdit = !!initialData;

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date || '');
      setAssessment(initialData.assessment || '');
      setHr(initialData.vitals?.hr || '');
      setSpo2(initialData.vitals?.spo2 || '');
      setTemp(initialData.vitals?.temp || '');
      setRr(initialData.vitals?.rr || '');
      setBp(initialData.vitals?.bp || '');
      setWeight(initialData.vitals?.weight || '');
    } else {
      setDate(''); setAssessment(''); setHr(''); setSpo2(''); setTemp(''); setRr(''); setBp(''); setWeight('');
    }
  }, [initialData, open]);

  if (!open) return null;

  const handleSave = () => {
    onSave({ date, assessment, vitals: { hr, spo2, temp, rr, bp, weight } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white animate-in slide-in-from-bottom duration-300"
        style={{ borderRadius: '24px 24px 0 0', maxHeight: '85vh', overflow: 'auto', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#D1D5DB' }} />
        </div>
        <div className="flex items-center justify-between px-5 pb-3">
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#1A2332' }}>
            {isEdit ? 'Edit Progress Note' : 'Add Progress Note'}
          </span>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted/50">
            <X size={20} style={{ color: '#6B7C93' }} />
          </button>
        </div>
        <div style={{ borderTop: '1px solid #DDE3EA' }} />

        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <span style={labelStyle}>Date</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={inputStyle} className="focus:!border-[#2563EB]" />
          </div>
          <div className="space-y-1.5">
            <span style={labelStyle}>Assessment</span>
            <textarea value={assessment} onChange={e => setAssessment(e.target.value)}
              placeholder="Clinical assessment..." rows={3}
              style={{ ...inputStyle, resize: 'none' }} className="focus:!border-[#2563EB]" />
          </div>

          <div className="flex items-center gap-3 py-1">
            <div style={{ flex: 1, borderTop: '1px solid #DDE3EA' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#6B7C93' }}>Vital Signs</span>
            <div style={{ flex: 1, borderTop: '1px solid #DDE3EA' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span style={labelStyle}>HR (BPM)</span>
              <input value={hr} onChange={e => setHr(e.target.value)} inputMode="numeric"
                style={inputStyle} className="focus:!border-[#2563EB]" />
            </div>
            <div className="space-y-1.5">
              <span style={labelStyle}>SPO₂ (%)</span>
              <input value={spo2} onChange={e => setSpo2(e.target.value)} inputMode="numeric"
                style={inputStyle} className="focus:!border-[#2563EB]" />
            </div>
            <div className="space-y-1.5">
              <span style={labelStyle}>TEMP (°C)</span>
              <input value={temp} onChange={e => setTemp(e.target.value)} inputMode="decimal"
                style={inputStyle} className="focus:!border-[#2563EB]" />
            </div>
            <div className="space-y-1.5">
              <span style={labelStyle}>RR (/MIN)</span>
              <input value={rr} onChange={e => setRr(e.target.value)} inputMode="numeric"
                style={inputStyle} className="focus:!border-[#2563EB]" />
            </div>
            <div className="space-y-1.5">
              <span style={labelStyle}>BP (MMHG)</span>
              <input value={bp} onChange={e => setBp(e.target.value)}
                style={inputStyle} className="focus:!border-[#2563EB]" />
            </div>
            <div className="space-y-1.5">
              <span style={labelStyle}>WEIGHT (KG)</span>
              <input value={weight} onChange={e => setWeight(e.target.value)} inputMode="decimal"
                style={inputStyle} className="focus:!border-[#2563EB]" />
            </div>
          </div>

          <button onClick={handleSave}
            style={{ width: '100%', height: '52px', borderRadius: '12px', background: '#2563EB', color: '#FFFFFF', fontSize: '16px', fontWeight: 700, border: 'none' }}>
            {isEdit ? 'Save Changes' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProgressNoteSheet;
