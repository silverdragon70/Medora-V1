import React, { useState, useEffect } from 'react';
import { Building2, Home } from 'lucide-react';
import { Section, Row, Chevron } from '../components/SettingsRow';
import ManageHospitalsSheet from '@/components/ManageHospitalsSheet';
import DefaultHospitalSheet from '@/components/DefaultHospitalSheet';
import { hospitalService } from '@/services/hospitalService';
import { settingsService } from '@/services/settingsService';
import type { Hospital } from '@/services/db/database';

const HospitalSection = () => {
  const [hospitalsOpen,       setHospitalsOpen]       = useState(false);
  const [defaultHospitalOpen, setDefaultHospitalOpen] = useState(false);
  const [hospitals,           setHospitals]           = useState<Hospital[]>([]);
  const [defaultHospitalId,   setDefaultHospitalId]   = useState('');
  const [defaultHospitalName, setDefaultHospitalName] = useState('None');

  const load = async () => {
    const all = await hospitalService.getAll();
    setHospitals(all);
    const id = await settingsService.getDefaultHospitalId();
    setDefaultHospitalId(id);
    const h = all.find(x => x.id === id);
    setDefaultHospitalName(h?.name ?? 'None');
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <Section title="Hospital Management">
        <Row icon={Building2} iconColor="#0EA5E9" label="Manage Hospitals" subtitle="Add, edit or remove"
          right={<Chevron />} onClick={() => setHospitalsOpen(true)} />
        <Row icon={Home} iconColor="#0EA5E9" label="Default Hospital" subtitle={defaultHospitalName}
          right={<Chevron />} onClick={() => setDefaultHospitalOpen(true)} noBorder />
      </Section>

      <ManageHospitalsSheet open={hospitalsOpen} onOpenChange={o => { setHospitalsOpen(o); if (!o) load(); }} />
      <DefaultHospitalSheet open={defaultHospitalOpen} onOpenChange={o => { setDefaultHospitalOpen(o); if (!o) load(); }}
        hospitals={hospitals} value={defaultHospitalId}
        onApply={id => { setDefaultHospitalId(id); settingsService.set('defaultHospitalId', id); load(); }} />
    </>
  );
};

export default HospitalSection;
