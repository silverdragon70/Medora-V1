import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { Section, Row, Chevron } from '../components/SettingsRow';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { settingsService } from '@/services/settingsService';
import { toast } from 'sonner';

// ── Edit Sheet ────────────────────────────────────────────────────────────────
const DoctorInfoSheet = ({
  open, onClose, onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; specialty: string; qualification: string; institution: string }) => void;
}) => {
  const [name,          setName]          = useState('');
  const [specialty,     setSpecialty]     = useState('');
  const [qualification, setQualification] = useState('');
  const [institution,   setInstitution]   = useState('');

  useEffect(() => {
    if (!open) return;
    Promise.all([
      settingsService.get('doctorName'),
      settingsService.get('doctorSpecialty'),
      settingsService.get('doctorQualification'),
      settingsService.get('doctorInstitution'),
    ]).then(([n, s, q, i]) => {
      setName(n ?? '');
      setSpecialty(s ?? '');
      setQualification(q ?? '');
      setInstitution(i ?? '');
    });
  }, [open]);

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 48, padding: '0 14px',
    background: '#F8FAFC', border: '1.5px solid #DDE3EA',
    borderRadius: 12, fontSize: 14, outline: 'none',
  };

  return (
    <Drawer open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Doctor Info</DrawerTitle>
        </DrawerHeader>
        <div className="px-5 space-y-4 overflow-y-auto" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
          {[
            { label: 'Full Name *',    val: name,          set: setName,          ph: 'Dr. John Smith'         },
            { label: 'Specialty',      val: specialty,     set: setSpecialty,     ph: 'e.g. General Pediatrics' },
            { label: 'Qualification',  val: qualification, set: setQualification, ph: 'e.g. MBBCh, MD'          },
            { label: 'Institution',    val: institution,   set: setInstitution,   ph: 'e.g. Cairo University'   },
          ].map(f => (
            <div key={f.label} className="space-y-1.5">
              <label className="text-[13px] font-semibold text-foreground">{f.label}</label>
              <input
                value={f.val} onChange={e => f.set(e.target.value)}
                placeholder={f.ph} style={inputStyle}
              />
            </div>
          ))}
          <button
            onClick={() => onSave({ name, specialty, qualification, institution })}
            disabled={!name.trim()}
            className="w-full h-[52px] rounded-[12px] font-semibold text-[15px] text-white transition-all"
            style={{ background: name.trim() ? '#2563EB' : '#CBD5E1' }}
          >
            Save
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

// ── Main Section ──────────────────────────────────────────────────────────────
const DoctorInfoSection = () => {
  const [sheetOpen,     setSheetOpen]     = useState(false);
  const [name,          setName]          = useState('');
  const [specialty,     setSpecialty]     = useState('');
  const [qualification, setQualification] = useState('');
  const [institution,   setInstitution]   = useState('');

  useEffect(() => {
    Promise.all([
      settingsService.get('doctorName'),
      settingsService.get('doctorSpecialty'),
      settingsService.get('doctorQualification'),
      settingsService.get('doctorInstitution'),
    ]).then(([n, s, q, i]) => {
      setName(n ?? '');
      setSpecialty(s ?? '');
      setQualification(q ?? '');
      setInstitution(i ?? '');
    });
  }, []);

  const handleSave = async (data: { name: string; specialty: string; qualification: string; institution: string }) => {
    await Promise.all([
      settingsService.set('doctorName',          data.name),
      settingsService.set('doctorSpecialty',     data.specialty),
      settingsService.set('doctorQualification', data.qualification),
      settingsService.set('doctorInstitution',   data.institution),
    ]);
    setName(data.name);
    setSpecialty(data.specialty);
    setQualification(data.qualification);
    setInstitution(data.institution);
    setSheetOpen(false);
    toast.success('Doctor info saved');
  };

  const subtitle = name
    ? [name, specialty].filter(Boolean).join(' · ')
    : 'Tap to enter your info';

  return (
    <>
      <Section title="Physician Info">
        <Row icon={User} iconColor="#2563EB" label="Enter Your Info"
          subtitle={subtitle} right={<Chevron />} onClick={() => setSheetOpen(true)} noBorder />
      </Section>

      <DoctorInfoSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
      />
    </>
  );
};

export default DoctorInfoSection;
