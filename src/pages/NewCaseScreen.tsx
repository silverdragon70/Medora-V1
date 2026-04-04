import { useContentSize } from '@/lib/useContentSize';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Camera, User, Calendar, Search, X, CalendarIcon, ChevronDown, ClipboardList, Stethoscope, ScrollText, Activity, Pill, Wind, Baby, AirVent, Upload, FlaskConical, HeartPulse, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { patientService } from "@/services/patientService";
import { caseService } from "@/services/caseService";
import { hospitalService } from "@/services/hospitalService";
import type { Hospital } from "@/services/db/database";
import { toast } from "sonner";
import AddInvestigationSheet from '@/components/case-detail/AddInvestigationSheet';

// existingPatients now loaded from DB inside component

const specialties = [
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'pulmonology', label: 'Pulmonology' },
  { value: 'gastroenterology', label: 'Gastroenterology' },
  { value: 'nephrology', label: 'Nephrology' },
  { value: 'neurology', label: 'Neurology' },
  { value: 'hematology', label: 'Hematology' },
  { value: 'endocrinology', label: 'Endocrinology' },
  { value: 'infectious-disease', label: 'Infectious Disease' },
  { value: 'neonatology', label: 'Neonatology' },
  { value: 'general-pediatrics', label: 'General Pediatrics' },
];

// hospitals loaded from DB inside component

const GenderIcon = ({ gender, size = 13 }: { gender: 'male' | 'female'; size?: number }) => (
  <span
    className={`font-bold ${gender === 'male' ? 'text-blue-500' : 'text-rose-400'}`}
    style={{ fontSize: size, lineHeight: 1 }}
  >
    {gender === 'male' ? '♂' : '♀'}
  </span>
);

const getInputClass = (fontSize: string) =>
  `w-full h-11 px-4 rounded-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors bg-[hsl(210,40%,98%)] border-[1.5px] border-[hsl(216,20%,90%)] focus:border-primary`
  + ` text-[${fontSize}]`;

const labelClass = 'text-[12px] font-bold uppercase tracking-wide';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  rightLabel?: string;
  onAdd?: () => void;
  children: React.ReactNode;
}

const CollapsibleSection = ({ title, icon, isExpanded, onToggle, rightLabel, onAdd, children }: CollapsibleSectionProps) => (
  <div className="bg-card border border-border rounded-[18px] overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-4 py-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-[16px] font-bold" style={{ color: '#1A2332' }}>{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {rightLabel && <span className="text-[12px]" style={{ color: '#6B7C93' }}>{rightLabel}</span>}
        {onAdd && (
          <button
            onClick={e => { e.stopPropagation(); onAdd(); }}
            className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
          >
            <Plus size={16} />
          </button>
        )}
        <ChevronDown
          size={18}
          style={{ color: '#6B7C93' }}
          className={cn('transition-transform duration-300', isExpanded && 'rotate-180')}
        />
      </div>
    </button>
    <div
      className={cn(
        'overflow-hidden transition-all duration-300 ease-in-out',
        isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      )}
    >
      <div className="px-4 pb-5 pt-1 border-t border-border">
        {children}
      </div>
    </div>
  </div>
);

type ExistingPatient = { patientId: string; name: string; fileNumber: string; age: string; gender: 'male' | 'female' };
const calcAge = (dob: string) => {
  const y = (Date.now() - new Date(dob).getTime()) / (1000*60*60*24*365.25);
  return y < 1 ? `${Math.round(y*12)}m` : `${Math.floor(y)}y`;
};

const NewCaseScreen = () => {
  const cs = useContentSize();
  const inputClass = getInputClass(cs.body.replace('text-[', '').replace(']', ''));
  const navigate = useNavigate();
  const location = useLocation();
  const [patientMode, setPatientMode] = useState<'new' | 'existing'>('new');
  const [selectedPatient, setSelectedPatient] = useState<ExistingPatient | null>(null);
  const [dbPatients, setDbPatients] = useState<ExistingPatient[]>([]);
  const [dbHospitals, setDbHospitals] = useState<Hospital[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    patientService.getAll().then(pts => setDbPatients(pts.map(p => ({
      patientId: p.id, name: p.full_name,
      fileNumber: p.file_number ?? '', age: calcAge(p.dob), gender: p.gender,
    }))));
    hospitalService.getAll().then(hospitals => {
      setDbHospitals(hospitals);
      const params = new URLSearchParams(location.search);
      const hospitalId = params.get('hospitalId');
      if (hospitalId && hospitals.find(h => h.id === hospitalId)) {
        setHospital(hospitalId);
      } else if (hospitals.length === 1) {
        setHospital(hospitals[0].id);
      }
    });
  }, [location.search]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // New patient form state
  const [patientName, setPatientName] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [fileNumber, setFileNumber] = useState('');
  const [hospital, setHospital] = useState('');
  const [admissionDate, setAdmissionDate] = useState<Date | undefined>(undefined);
  const [specialty, setSpecialty] = useState('');
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState('');
  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [presentHistory, setPresentHistory] = useState('');
  const [pastMedicalHistory, setPastMedicalHistory] = useState('');
  const [allergies, setAllergies] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [hr, setHr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [temp, setTemp] = useState('');
  const [rr, setRr] = useState('');
  const [bp, setBp] = useState('');
  const [weight, setWeight] = useState('');
  const [vitalDateTime, setVitalDateTime] = useState('');

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    patient: true,
    classification: false,
    history: false,
    vitals: false,
    investigations: false,
    management: false,
    progressNote: false,
    medications: false,
    respiratory: false,
    feeding: false,
  });

  const [medications, setMedications] = useState('');
  const [respiratorySupport, setRespiratorySupport] = useState('');
  const [respiratoryType, setRespiratoryType] = useState('');
  const [feeding, setFeeding] = useState('');
  const [investigationName, setInvestigationName] = useState('');
  const [investigationType, setInvestigationType] = useState('');
  const [investigationDate, setInvestigationDate] = useState<Date | undefined>(undefined);
  const [investigationResult, setInvestigationResult] = useState('');
  const [progressNoteDate, setProgressNoteDate] = useState<Date | undefined>(undefined);
  const [progressNoteAssessment, setProgressNoteAssessment] = useState('');

  // Image states
  const [invImages, setInvImages] = useState<{ dataUrl: string; name: string }[]>([]);
  const [medImages, setMedImages] = useState<{ dataUrl: string; name: string }[]>([]);
  const [attachImages, setAttachImages] = useState<{ dataUrl: string; name: string }[]>([]);
  const invFileRef = useRef<HTMLInputElement>(null);
  const medFileRef = useRef<HTMLInputElement>(null);
  const attachFileRef = useRef<HTMLInputElement>(null);

  // Investigations list state
  interface InvItem { id: string; name: string; type: string; date: string; result: string; images: { dataUrl: string; name: string }[] }
  const [investigationsList, setInvestigationsList] = useState<InvItem[]>([]);
  const [showAddInvSheet, setShowAddInvSheet] = useState(false);

  const handleImagePick = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<{ dataUrl: string; name: string }[]>>
  ) => {
    Array.from(e.target.files ?? []).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setter(prev => [...prev, { dataUrl: ev.target?.result as string, name: file.name }]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Section refs for quick nav
  const sectionRefs = {
    patient: useRef<HTMLDivElement>(null),
    classification: useRef<HTMLDivElement>(null),
    history: useRef<HTMLDivElement>(null),
    investigations: useRef<HTMLDivElement>(null),
    management: useRef<HTMLDivElement>(null),
    progressNote: useRef<HTMLDivElement>(null),
    attachImages: useRef<HTMLDivElement>(null),
  };

  const navPills = [
    { key: 'patient', label: 'Info' },
    { key: 'classification', label: 'Class' },
    { key: 'history', label: 'History' },
    { key: 'investigations', label: 'Inv' },
    { key: 'management', label: 'Management' },
    { key: 'progressNote', label: 'Progress' },
  ];

  const [activePill, setActivePill] = useState('patient');
  const pillBarRef = useRef<HTMLDivElement>(null);

  const handlePillClick = useCallback((key: string) => {
    const ref = sectionRefs[key as keyof typeof sectionRefs];
    if (ref.current) {
      // Expand section if collapsed
      if (key === 'progressNote') {
        setExpandedSections(prev => ({ ...prev, progressNote: true }));
      } else {
        setExpandedSections(prev => ({ ...prev, [key]: true }));
      }
      
      setTimeout(() => {
        const el = ref.current;
        if (!el) return;
        // Calculate offset: header (~52px) + nav bar (~50px)
        const offset = 110;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }, 100);
    }
    setActivePill(key);
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const entries = Object.entries(sectionRefs);
    
    entries.forEach(([key, ref]) => {
      if (!ref.current) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActivePill(key);
          }
        },
        { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
      );
      observer.observe(ref.current);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return dbPatients.filter(
      (p) => p.name.toLowerCase().includes(q) || p.fileNumber.toLowerCase().includes(q)
    );
  }, [searchQuery, dbPatients]);

  const handleSelectPatient = (patient: ExistingPatient) => {
    setSelectedPatient(patient);
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 pb-3 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[16px] font-bold text-foreground">New Case</h1>
        <button
          onClick={async () => {
            if (saving) return;
            // Validation
            if (patientMode === 'new' && !patientName.trim()) { toast.error('Please enter patient name'); return; }
            if (patientMode === 'existing' && !selectedPatient) { toast.error('Please select a patient'); return; }
            setSaving(true);
            try {
              let patientId = selectedPatient?.patientId ?? '';
              if (patientMode === 'new') {
                const dob = dobYear && dobMonth && dobDay
                  ? `${dobYear}-${dobMonth.padStart(2,'0')}-${dobDay.padStart(2,'0')}`
                  : new Date().toISOString().split('T')[0];
                const newPat = await patientService.create({
                  full_name: patientName.trim(),
                  dob,
                  gender: (gender as 'male'|'female') || 'male',
                  file_number: fileNumber || undefined,
                });
                patientId = newPat.id;
              }
              const newCase = await caseService.create({
                patient_id: patientId,
                hospital_id: hospital || undefined,
                specialty: specialty || undefined,
                provisional_diagnosis: provisionalDiagnosis || undefined,
                chief_complaint: chiefComplaint || undefined,
                present_history: presentHistory || undefined,
                past_medical_history: pastMedicalHistory || undefined,
                allergies: allergies || undefined,
                current_medications: currentMedications || undefined,
                admission_date: admissionDate ? admissionDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              });

              // Save investigations
              if (investigationsList.length > 0) {
                const { investigationService } = await import('@/services/investigationService');
                const { mediaService } = await import('@/services/mediaService');
                for (const inv of investigationsList) {
                  const savedInv = await investigationService.create(newCase.id, {
                    name: inv.name,
                    type: inv.type as 'lab' | 'imaging' | 'other',
                    date: inv.date,
                    result: inv.result || undefined,
                  });
                  for (const img of inv.images) {
                    await investigationService.addImageFromDataUrl(savedInv.id, img.dataUrl, img.name);
                    const checksum = btoa(img.name + img.dataUrl.length).slice(0, 32);
                    await mediaService.add(newCase.id, img.dataUrl, img.dataUrl, checksum);
                  }
                }
              }

              // Save attach images to media
              if (attachImages.length > 0) {
                const { mediaService } = await import('@/services/mediaService');
                for (const img of attachImages) {
                  const checksum = btoa(img.name + img.dataUrl.length).slice(0, 32);
                  await mediaService.add(newCase.id, img.dataUrl, img.dataUrl, checksum);
                }
              }

              toast.success('Case saved successfully');
              navigate(`/case/${newCase.id}`, { replace: true });
            } catch (e: unknown) {
              toast.error('Failed to save case');
              console.error(e);
            } finally { setSaving(false); }
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[13px] font-bold active:scale-95 transition-transform"
        >
          <Save size={14} className="inline mr-1" /> Save
        </button>
      </header>

      {/* Quick Navigation Bar */}
      <div className="sticky top-[52px] z-40" style={{ background: '#F0F4F8' }}>
        <div ref={pillBarRef} className="flex gap-2 overflow-x-auto no-scrollbar" style={{ padding: '10px 16px' }}>
          {navPills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => handlePillClick(pill.key)}
              className={cn(
                'whitespace-nowrap text-[13px] font-semibold rounded-[20px] transition-colors shrink-0',
                activePill === pill.key
                  ? 'text-white'
                  : 'text-[hsl(215,15%,50%)] border-[1.5px] border-[hsl(216,20%,90%)] bg-white'
              )}
              style={{
                padding: '8px 14px',
                ...(activePill === pill.key ? { backgroundColor: '#2563EB' } : {}),
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 space-y-5 pb-10">

        {/* ═══ Patient Information ═══ */}
        <div ref={sectionRefs.patient}>
        <CollapsibleSection
          title="Patient Information"
          icon={<ClipboardList size={18} className="text-primary" />}
          isExpanded={expandedSections.patient}
          onToggle={() => toggleSection('patient')}
        >
          <div className="space-y-4 pt-3">
            <div className="p-1 bg-muted rounded-xl flex gap-1">
              <button
                onClick={() => setPatientMode('new')}
                className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all ${
                  patientMode === 'new' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
                }`}
              >
                New Patient
              </button>
              <button
                onClick={() => setPatientMode('existing')}
                className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all ${
                  patientMode === 'existing' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Existing Patient
              </button>
            </div>

            {patientMode === 'existing' ? (
              <div className="bg-muted/30 border border-border rounded-xl overflow-hidden">
                {selectedPatient ? (
                  <div className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-foreground flex items-center gap-1.5">
                        {selectedPatient.name}
                        <GenderIcon gender={selectedPatient.gender} size={14} />
                      </p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{selectedPatient.fileNumber}</p>
                      <p className="text-[12px] text-muted-foreground">{selectedPatient.age}</p>
                    </div>
                    <button
                      onClick={handleClearPatient}
                      className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="px-4 py-3 flex items-center gap-2 border-b border-border">
                      <Search size={16} className="text-muted-foreground" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
                        placeholder="Search by name or file number..."
                        className="flex-1 text-[13px] text-foreground placeholder:text-muted-foreground bg-transparent focus:outline-none"
                      />
                    </div>
                    {searchQuery.trim() && (
                      <div className="max-h-[200px] overflow-y-auto divide-y divide-border">
                        {filteredPatients.length > 0 ? (
                          filteredPatients.map((p) => (
                            <button
                              key={p.patientId}
                              onMouseDown={() => handleSelectPatient(p)}
                              className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                            >
                              <span className="text-[13px] font-medium text-foreground">{p.name}</span>
                              <span className="text-[11px] text-muted-foreground">{p.fileNumber}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-4 text-center text-[13px] text-muted-foreground">
                            No patients found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className={labelClass} style={{ color: '#6B7C93' }}>Full Name (English) <span className="text-destructive">*</span></label>
                  <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Patient's full name in English" className={inputClass} />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass} style={{ color: '#6B7C93' }}>Date of Birth</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={dobDay} onChange={(e) => setDobDay(e.target.value.replace(/\D/g, ''))} placeholder="DD" className={cn(inputClass, 'text-center')} />
                    <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={dobMonth} onChange={(e) => setDobMonth(e.target.value.replace(/\D/g, ''))} placeholder="MM" className={cn(inputClass, 'text-center')} />
                    <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={dobYear} onChange={(e) => setDobYear(e.target.value.replace(/\D/g, ''))} placeholder="YYYY" className={cn(inputClass, 'text-center')} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass} style={{ color: '#6B7C93' }}>Gender</label>
                  <div className="flex gap-3">
                    {(['male', 'female'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={cn(
                          'flex-1 h-11 rounded-[12px] text-[14px] font-medium border-[1.5px] transition-colors',
                          gender === g
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-white text-muted-foreground border-[hsl(216,20%,90%)] hover:bg-muted/50'
                        )}
                      >
                        {g === 'male' ? '♂ Male' : '♀ Female'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={labelClass} style={{ color: '#6B7C93' }}>File Number</label>
                    <input type="text" value={fileNumber} onChange={(e) => setFileNumber(e.target.value)} placeholder="e.g. 24-10842" className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass} style={{ color: '#6B7C93' }}>Hospital</label>
                    <Select value={hospital} onValueChange={setHospital}>
                      <SelectTrigger className="w-full h-11 bg-[hsl(210,40%,98%)] border-[1.5px] border-[hsl(216,20%,90%)] rounded-[12px] text-[14px] focus:border-primary">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {dbHospitals.length === 0
                          ? <SelectItem value="__none" disabled>No hospitals — add one first</SelectItem>
                          : dbHospitals.map(h => (
                            <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass} style={{ color: '#6B7C93' }}>Admission Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left text-[14px] h-11 bg-[hsl(210,40%,98%)] border-[1.5px] border-[hsl(216,20%,90%)] rounded-[12px] hover:border-primary">
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {admissionDate ? format(admissionDate, 'MM/dd/yyyy') : <span className="text-muted-foreground">mm/dd/yyyy</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker mode="single" selected={admissionDate} onSelect={setAdmissionDate} initialFocus className={cn('p-3 pointer-events-auto')} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
        </div>

        {/* ═══ Initial Classification ═══ */}
        <div ref={sectionRefs.classification}>
        <CollapsibleSection
          title="Classification"
          icon={<Stethoscope size={18} className="text-primary" />}
          isExpanded={expandedSections.classification}
          onToggle={() => toggleSection('classification')}
        >
          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className={labelClass} style={{ color: '#6B7C93' }}>Specialty</label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger className="w-full h-11 bg-[hsl(210,40%,98%)] border-[1.5px] border-[hsl(216,20%,90%)] rounded-[12px] text-[14px] focus:border-primary">
                  <SelectValue placeholder="Select specialty..." />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className={labelClass} style={{ color: '#6B7C93' }}>Provisional Diagnosis</label>
              <textarea value={provisionalDiagnosis} onChange={(e) => setProvisionalDiagnosis(e.target.value)} placeholder="Enter working diagnosis..." rows={3} className={cn(inputClass, 'h-auto py-3 resize-none')} />
            </div>

            <div className="space-y-1.5">
              <label className={labelClass} style={{ color: '#6B7C93' }}>Final Diagnosis</label>
              <textarea value={finalDiagnosis} onChange={(e) => setFinalDiagnosis(e.target.value)} placeholder="Enter final diagnosis..." rows={3} className={cn(inputClass, 'h-auto py-3 resize-none')} />
            </div>
          </div>
        </CollapsibleSection>
        </div>

        {/* ═══ Patient History ═══ */}
        <div ref={sectionRefs.history}>
        <CollapsibleSection
          title="Patient History"
          icon={<ScrollText size={18} className="text-primary" />}
          isExpanded={expandedSections.history}
          onToggle={() => toggleSection('history')}
        >
          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className={labelClass} style={{ color: '#6B7C93' }}>Chief Complaint</label>
              <textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="High-grade fever and cough..." rows={3} className={cn(inputClass, 'h-auto py-3 resize-none')} />
            </div>

            <div className="space-y-1.5">
              <label className={labelClass} style={{ color: '#6B7C93' }}>Present History</label>
              <textarea value={presentHistory} onChange={(e) => setPresentHistory(e.target.value)} placeholder="History of present illness..." rows={3} className={cn(inputClass, 'h-auto py-3 resize-none')} />
            </div>

            <div className="space-y-1.5">
              <label className={labelClass} style={{ color: '#6B7C93' }}>Past Medical History</label>
              <textarea value={pastMedicalHistory} onChange={(e) => setPastMedicalHistory(e.target.value)} placeholder="No significant PMH..." rows={3} className={cn(inputClass, 'h-auto py-3 resize-none')} />
            </div>

            <div className="space-y-1.5">
              <label className={labelClass} style={{ color: '#6B7C93' }}>Allergies</label>
              <input type="text" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Penicillin — Rash" className={cn(inputClass, 'h-12')} />
            </div>

            <div className="space-y-1.5">
              <label className={labelClass} style={{ color: '#6B7C93' }}>Current Medications (Pre-Admission)</label>
              <textarea value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} placeholder="List current medications..." rows={3} className={cn(inputClass, 'h-auto py-3 resize-none')} />
            </div>
          </div>
        </CollapsibleSection>
        </div>


        {/* ═══ Investigations ═══ */}
        <div ref={sectionRefs.investigations}>
        <CollapsibleSection
          title="Investigations"
          icon={<span className="text-[18px]">🔬</span>}
          isExpanded={expandedSections.investigations}
          onToggle={() => toggleSection('investigations')}
          onAdd={() => setShowAddInvSheet(true)}
        >
          <div className="space-y-3 pt-2">
            {investigationsList.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-[13px] text-muted-foreground">No investigations added yet.</p>
                <button onClick={() => setShowAddInvSheet(true)}
                  className="mt-2 text-[13px] text-primary font-semibold">
                  + Add Investigation
                </button>
              </div>
            )}
            {investigationsList.map((inv, i) => (
              <div key={inv.id} className="bg-[hsl(210,40%,98%)] border border-[hsl(216,20%,90%)] rounded-[12px] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold" style={{ color: '#1A2332' }}>{inv.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: inv.type === 'lab' ? '#DBEAFE' : inv.type === 'imaging' ? '#F3E8FF' : '#F0FDF4', color: inv.type === 'lab' ? '#2563EB' : inv.type === 'imaging' ? '#7C3AED' : '#16A34A' }}>
                        {inv.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{inv.date}</p>
                    {inv.result && <p className="text-[12px] mt-1" style={{ color: '#6B7C93' }}>{inv.result}</p>}
                    {inv.images.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {inv.images.map((img, j) => (
                          <div key={j} style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden' }}>
                            <img src={img.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setInvestigationsList(p => p.filter((_, j) => j !== i))}
                    className="p-1 rounded-full hover:bg-red-50">
                    <X size={14} style={{ color: '#EF4444' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
        </div>

        {/* ═══ Management ═══ */}
        <div ref={sectionRefs.management}>
        <CollapsibleSection
          title="Management"
          icon={<span className="text-[18px]">⚕️</span>}
          isExpanded={expandedSections.management}
          onToggle={() => toggleSection('management')}
        >
          <div className="space-y-2 pt-2">
            {/* Nested: Medications */}
            <div className="rounded-[14px] border border-[hsl(216,20%,90%)] bg-[hsl(210,40%,98%)] overflow-hidden">
              <button
                onClick={() => toggleSection('medications')}
                className="w-full px-3 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">💊</span>
                  <span className="text-[15px] font-bold" style={{ color: '#1A2332' }}>Medications</span>
                </div>
                <ChevronDown
                  size={16}
                  style={{ color: '#6B7C93' }}
                  className={cn('transition-transform duration-300', expandedSections.medications && 'rotate-180')}
                />
              </button>
              <div className={cn(
                'overflow-hidden transition-all duration-300 ease-in-out',
                expandedSections.medications ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
              )}>
                <div className="px-3 pb-3 pt-1 border-t border-[hsl(216,20%,90%)]">
                  <div className="space-y-1.5">
                    <label className={labelClass} style={{ color: '#6B7C93' }}>Current Medications</label>
                    <textarea value={medications} onChange={(e) => setMedications(e.target.value)} placeholder="List medications, doses, and routes..." rows={3} className={cn(inputClass, 'h-auto py-3 resize-none')} />
                  </div>
                  {/* Medication chart images */}
                  <input ref={medFileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                    onChange={e => handleImagePick(e, setMedImages)} />
                  {medImages.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {medImages.map((img, i) => (
                        <div key={i} style={{ position: 'relative', width: 64, height: 64, borderRadius: 8, overflow: 'hidden' }}>
                          <img src={img.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => setMedImages(p => p.filter((_, j) => j !== i))}
                            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <X size={10} color="white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => medFileRef.current?.click()}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-[10px] border border-dashed border-[hsl(216,20%,90%)] text-muted-foreground hover:border-primary hover:text-primary transition-colors text-[12px] font-medium">
                    <Upload size={14} />
                    {medImages.length > 0 ? `${medImages.length} chart(s) — add more` : 'Attach medication chart'}
                  </button>
                </div>
              </div>
            </div>

            {/* Nested: Respiratory Support */}
            <div className="rounded-[14px] border border-[hsl(216,20%,90%)] bg-[hsl(210,40%,98%)] overflow-hidden">
              <button
                onClick={() => toggleSection('respiratory')}
                className="w-full px-3 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <AirVent size={16} className="text-primary" />
                  <span className="text-[15px] font-bold" style={{ color: '#1A2332' }}>Respiratory Support</span>
                </div>
                <ChevronDown
                  size={16}
                  style={{ color: '#6B7C93' }}
                  className={cn('transition-transform duration-300', expandedSections.respiratory && 'rotate-180')}
                />
              </button>
              <div className={cn(
                'overflow-hidden transition-all duration-300 ease-in-out',
                expandedSections.respiratory ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
              )}>
                <div className="px-3 pb-3 pt-1 border-t border-[hsl(216,20%,90%)]">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className={labelClass} style={{ color: '#6B7C93' }}>Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { value: 'room-air', label: 'Room Air', icon: <span>💨</span> },
                          { value: 'nasal-o2', label: 'Nasal O₂', icon: <span>👃</span> },
                          { value: 'mask', label: 'Mask', icon: <span>😷</span> },
                          { value: 'hfnc', label: 'HFNC', icon: <span>🌬️</span> },
                          { value: 'cpap', label: 'CPAP', icon: <span>⚙️</span> },
                          { value: 'mv', label: 'MV', icon: <AirVent size={14} /> },
                        ] as const).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRespiratoryType(opt.value)}
                            className={cn(
                              'h-11 rounded-[12px] text-[13px] font-medium border-[1.5px] transition-colors flex items-center justify-center gap-1.5',
                              respiratoryType === opt.value
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-[hsl(210,40%,98%)] text-muted-foreground border-[hsl(216,20%,90%)] hover:bg-muted/50'
                            )}
                          >
                            {opt.icon} {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelClass} style={{ color: '#6B7C93' }}>Details</label>
                      <textarea value={respiratorySupport} onChange={(e) => setRespiratorySupport(e.target.value)} placeholder="Mode, FiO₂, settings..." rows={3} className={cn(inputClass, 'h-auto py-3 resize-none')} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nested: Feeding */}
            <div className="rounded-[14px] border border-[hsl(216,20%,90%)] bg-[hsl(210,40%,98%)] overflow-hidden">
              <button
                onClick={() => toggleSection('feeding')}
                className="w-full px-3 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">🍼</span>
                  <span className="text-[15px] font-bold" style={{ color: '#1A2332' }}>Feeding</span>
                </div>
                <ChevronDown
                  size={16}
                  style={{ color: '#6B7C93' }}
                  className={cn('transition-transform duration-300', expandedSections.feeding && 'rotate-180')}
                />
              </button>
              <div className={cn(
                'overflow-hidden transition-all duration-300 ease-in-out',
                expandedSections.feeding ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
              )}>
                <div className="px-3 pb-3 pt-1 border-t border-[hsl(216,20%,90%)]">
                  <div className="space-y-1.5">
                    <label className={labelClass} style={{ color: '#6B7C93' }}>Feeding Details</label>
                    <textarea value={feeding} onChange={(e) => setFeeding(e.target.value)} placeholder="Type, volume, frequency..." rows={3} className={cn(inputClass, 'h-auto py-3 resize-none')} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>
        </div>

        {/* ═══ Progress Note ═══ */}
        <div ref={sectionRefs.progressNote}>
        <CollapsibleSection
          title="Progress Note"
          icon={<span className="text-[18px]">📝</span>}
          isExpanded={expandedSections.progressNote}
          onToggle={() => toggleSection('progressNote')}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className={labelClass} style={{ color: '#6B7C93' }}>Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn(inputClass, 'flex items-center justify-between text-left', !progressNoteDate && 'text-muted-foreground')}>
                    {progressNoteDate ? format(progressNoteDate, 'MM/dd/yyyy') : 'mm/dd/yyyy'}
                    <CalendarIcon size={16} className="text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker mode="single" selected={progressNoteDate} onSelect={setProgressNoteDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass} style={{ color: '#6B7C93' }}>Assessment</label>
              <textarea
                value={progressNoteAssessment}
                onChange={(e) => setProgressNoteAssessment(e.target.value)}
                placeholder="Clinical assessment..."
                rows={3}
                className={cn(inputClass, 'h-auto py-3 resize-none')}
              />
            </div>

            {/* Nested: Vital Signs */}
            <div className="rounded-[14px] border border-[hsl(216,20%,90%)] bg-[hsl(210,40%,98%)] overflow-hidden">
              <button
                onClick={() => toggleSection('vitals')}
                className="w-full px-3 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <HeartPulse size={16} className="text-primary" />
                  <span className="text-[15px] font-bold" style={{ color: '#1A2332' }}>Vital Signs</span>
                </div>
                <ChevronDown
                  size={16}
                  style={{ color: '#6B7C93' }}
                  className={cn('transition-transform duration-300', expandedSections.vitals && 'rotate-180')}
                />
              </button>
              <div className={cn(
                'overflow-hidden transition-all duration-300 ease-in-out',
                expandedSections.vitals ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
              )}>
                <div className="px-3 pb-3 pt-1 border-t border-[hsl(216,20%,90%)]">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className={labelClass} style={{ color: '#6B7C93' }}>HR (BPM)</label>
                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={hr} onChange={(e) => setHr(e.target.value.replace(/\D/g, ''))} placeholder="128" className={cn(inputClass, 'h-12')} />
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass} style={{ color: '#6B7C93' }}>SPO₂ (%)</label>
                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={spo2} onChange={(e) => setSpo2(e.target.value.replace(/\D/g, ''))} placeholder="94" className={cn(inputClass, 'h-12')} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className={labelClass} style={{ color: '#6B7C93' }}>Temp (°C)</label>
                        <input type="text" inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="38.6" className={cn(inputClass, 'h-12')} />
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass} style={{ color: '#6B7C93' }}>RR (/Min)</label>
                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={rr} onChange={(e) => setRr(e.target.value.replace(/\D/g, ''))} placeholder="46" className={cn(inputClass, 'h-12')} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className={labelClass} style={{ color: '#6B7C93' }}>BP (mmHg)</label>
                        <input type="text" inputMode="numeric" value={bp} onChange={(e) => setBp(e.target.value.replace(/[^0-9/]/g, ''))} placeholder="88/55" className={cn(inputClass, 'h-12')} />
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass} style={{ color: '#6B7C93' }}>Weight (kg)</label>
                        <input type="text" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="13.2" className={cn(inputClass, 'h-12')} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelClass} style={{ color: '#6B7C93' }}>Date & Time</label>
                      <input type="datetime-local" value={vitalDateTime} onChange={(e) => setVitalDateTime(e.target.value)} className={cn(inputClass, 'h-12')} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>
        </div>

        {/* ═══ Attach Images ═══ */}
        <div ref={sectionRefs.attachImages}>
        <div className="bg-card border border-border rounded-[18px] p-4">
          <span className="text-[12px] font-bold text-foreground block mb-3">Attach Images</span>
          <input ref={attachFileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => handleImagePick(e, setAttachImages)} />
          <div className="flex gap-2 flex-wrap">
            {attachImages.map((img, i) => (
              <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 10, overflow: 'hidden' }}>
                <img src={img.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setAttachImages(p => p.filter((_, j) => j !== i))}
                  style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={10} color="white" />
                </button>
              </div>
            ))}
            <button
              onClick={() => attachFileRef.current?.click()}
              className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Camera size={20} />
              <span className="text-[9px] font-bold mt-1">ADD</span>
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Add Investigation Sheet */}
      <AddInvestigationSheet
        open={showAddInvSheet}
        onClose={() => setShowAddInvSheet(false)}
        onSave={(data) => {
          setInvestigationsList(prev => [...prev, {
            id: Date.now().toString(),
            name: data.name || 'Unnamed',
            type: data.type || 'lab',
            date: data.date || new Date().toISOString().split('T')[0],
            result: data.result || '',
            images: data.images || [],
          }]);
          setShowAddInvSheet(false);
        }}
      />
    </div>
  );
};

export default NewCaseScreen;
