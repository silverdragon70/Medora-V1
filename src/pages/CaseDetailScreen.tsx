import { useContentSize } from '@/lib/useContentSize';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Camera, Image, ChevronDown, ChevronUp, Upload, Lightbulb, Pencil, Plus, LogOut, CalendarDays, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SPECIALTIES = [
  'Cardiology', 'Pulmonology', 'Gastroenterology', 'Nephrology',
  'Neurology', 'Hematology', 'Endocrinology', 'Infectious Disease',
  'Neonatology', 'General Pediatrics',
];
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import CaseExportSheet from '@/lib/export/case/CaseExportSheet';
import type { CaseExportData } from '@/lib/export/case/CaseExportSheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AddInvestigationSheet from '@/components/case-detail/AddInvestigationSheet';
import AddManagementSheet from '@/components/case-detail/AddManagementSheet';
import AddProgressNoteSheet from '@/components/case-detail/AddProgressNoteSheet';
import { caseService } from '@/services/caseService';
import { patientService } from '@/services/patientService';
import { hospitalService } from '@/services/hospitalService';
import { investigationService } from '@/services/investigationService';
import { managementService } from '@/services/managementService';
import { progressNoteService } from '@/services/progressNoteService';
import { toast } from 'sonner';
import type { Case, Patient, Hospital, Investigation, ManagementEntry } from '@/services/db/database';
import type { ProgressNoteWithVitals } from '@/services/progressNoteService';
const navPills = [
  { key: 'patientInfo', label: 'Info' },
  { key: 'classification', label: 'Class' },
  { key: 'history', label: 'History' },
  { key: 'investigations', label: 'Inv' },
  { key: 'management', label: 'Management' },
  { key: 'progress', label: 'Progress' },
];

const exportColumns = [
  { header: 'Field', key: 'field' },
  { header: 'Value', key: 'value' },
];

// Reusable display field
const DisplayField = ({ label, value, isMultiLine = false, isEditing = false, onChange, fontSize = '15px' }: {
  label: string; value: string; isMultiLine?: boolean; isEditing?: boolean; onChange?: (v: string) => void; fontSize?: string;
}) => (
  <div className="space-y-1.5">
    <span style={{ color: '#6B7C93', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </span>
    {isEditing && onChange ? (
      isMultiLine ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          style={{
            width: '100%', background: '#FFFFFF', border: '1.5px solid #2563EB',
            borderRadius: '12px', padding: '12px 16px', color: '#1A2332',
            fontSize, lineHeight: '1.5', resize: 'none', outline: 'none',
          }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', background: '#FFFFFF', border: '1.5px solid #2563EB',
            borderRadius: '12px', padding: '12px 16px', color: '#1A2332',
            fontSize, outline: 'none',
          }}
        />
      )
    ) : (
      <div
        className={isMultiLine ? 'min-h-[80px]' : ''}
        style={{
          background: '#F8FAFC', border: '1.5px solid #DDE3EA',
          borderRadius: '12px', padding: '12px 16px',
          color: '#1A2332', fontSize, lineHeight: '1.5',
        }}
      >
        {value || '—'}
      </div>
    )}
  </div>
);

// Accordion section wrapper
const AccordionSection = ({
  icon, title, isExpanded, onToggle, children, sectionRef,
  onEdit, onAdd, isEditing,
}: {
  icon: string; title: string; isExpanded: boolean; onToggle: () => void;
  children: React.ReactNode; sectionRef?: React.RefObject<HTMLDivElement>;
  onEdit?: () => void; onAdd?: () => void; isEditing?: boolean;
}) => (
  <div
    ref={sectionRef}
    style={{
      background: '#FFFFFF', borderRadius: '18px', padding: '0',
      boxShadow: '0px 2px 8px rgba(0,0,0,0.06)', marginBottom: '16px', overflow: 'hidden',
    }}
  >
    <div className="flex items-center justify-between hover:bg-muted/30 transition-colors" style={{ padding: '16px' }}>
      <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left">
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1A2332' }}>{title}</span>
      </button>
      <div className="flex items-center gap-1">
        {onAdd && (
          <button onClick={(e) => { e.stopPropagation(); onAdd(); }} className="p-1.5 rounded-full hover:bg-muted/50 transition-colors">
            <Plus size={16} style={{ color: '#2563EB' }} />
          </button>
        )}
        {onEdit && (
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-full hover:bg-muted/50 transition-colors">
            <Pencil size={15} style={{ color: isEditing ? '#16A34A' : '#2563EB' }} />
          </button>
        )}
        <button onClick={onToggle} className="p-1.5">
          <ChevronDown size={18} className="text-muted-foreground transition-transform duration-300"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>
      </div>
    </div>
    <div className="transition-all duration-300 ease-in-out overflow-hidden"
      style={{ maxHeight: isExpanded ? '2000px' : '0', opacity: isExpanded ? 1 : 0 }}>
      <div style={{ padding: '0 16px 16px 16px' }} className="space-y-3">{children}</div>
    </div>
  </div>
);

// Nested sub-accordion
const SubAccordion = ({
  icon, title, isExpanded, onToggle, children,
}: {
  icon: string; title: string; isExpanded: boolean; onToggle: () => void; children: React.ReactNode;
}) => (
  <div style={{ background: '#F8FAFC', borderRadius: '14px', border: '1px solid #DDE3EA', overflow: 'hidden' }}>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between hover:bg-muted/30 transition-colors"
      style={{ padding: '12px' }}
    >
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '14px' }}>{icon}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1A2332' }}>{title}</span>
      </div>
      <ChevronDown
        size={16}
        className="text-muted-foreground transition-transform duration-300"
        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
      />
    </button>
    <div
      className="transition-all duration-300 ease-in-out overflow-hidden"
      style={{ maxHeight: isExpanded ? '1500px' : '0', opacity: isExpanded ? 1 : 0 }}
    >
      <div style={{ padding: '0 12px 12px 12px', borderTop: '1px solid #DDE3EA' }} className="space-y-3 pt-3">
        {children}
      </div>
    </div>
  </div>
);

const GenderPill = ({ gender }: { gender: 'male' | 'female' }) => (
  <div className="flex gap-2">
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 600,
        background: gender === 'male' ? '#2563EB' : '#EC4899',
        color: '#FFFFFF',
      }}
    >
      {gender === 'male' ? '♂' : '♀'} {gender === 'male' ? 'Male' : 'Female'}
    </span>
  </div>
);

const CaseDetailScreen = () => {
  const cs = useContentSize();
  const navigate = useNavigate();
  const { id } = useParams();

  // ── Real data state ────────────────────────────────────────────────────────
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [managementEntries, setManagementEntries] = useState<ManagementEntry[]>([]);
  const [progressNotes, setProgressNotes] = useState<ProgressNoteWithVitals[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const [caseMediaList, setCaseMediaList] = useState<{id: string; dataUrl: string}[]>([]);
  const [managementImages, setManagementImages] = useState<Record<string, string[]>>({});

  const [investigationImages, setInvestigationImages] = useState<Record<string, { thumbnail_path: string; full_path: string; id: string }[]>>({});

  const reloadCase = useCallback(async () => {
    if (!id) return;
    try {
      const [c, invs, mgmt, notes] = await Promise.all([
        caseService.getById(id),
        investigationService.getByCase(id),
        managementService.getByCase(id),
        progressNoteService.getByCase(id),
      ]);
      if (!c) return;
      setCaseData(c);
      setCaseStatus(c.status);
      // Sync editable fields
      setEditSpecialty(c.specialty ?? '');
      setEditProvisional(c.provisional_diagnosis ?? '');
      setEditFinal(c.final_diagnosis ?? '');
      setEditChief(c.chief_complaint ?? '');
      setEditPresent(c.present_history ?? '');
      setEditPast(c.past_medical_history ?? '');
      setEditAllergies(c.allergies ?? '');
      setEditMeds(c.current_medications ?? '');
      setInvestigations(invs);
      setManagementEntries(mgmt);
      setProgressNotes(notes);

      // Load images for each investigation
      const imgMap: Record<string, { thumbnail_path: string; full_path: string; id: string }[]> = {};
      for (const inv of invs) {
        const imgs = await investigationService.getImages(inv.id);
        imgMap[inv.id] = imgs.map(i => ({ thumbnail_path: i.thumbnail_path, full_path: i.full_path, id: i.id }));
      }
      setInvestigationImages(imgMap);

      // Load case media
      const { mediaService } = await import('@/services/mediaService');
      const mediaItems = await mediaService.getByCase(id);
      setCaseMediaList(mediaItems.map(m => ({ id: m.id, dataUrl: m.full_path })));

      // Group management images by entry id (checksum starts with mgmt_{entryId})
      const mgmtImgMap: Record<string, string[]> = {};
      for (const m of mediaItems) {
        if (m.checksum?.startsWith('mgmt_')) {
          const entryId = m.checksum.split('_')[1];
          if (entryId) {
            if (!mgmtImgMap[entryId]) mgmtImgMap[entryId] = [];
            mgmtImgMap[entryId].push(m.full_path);
          }
        }
      }
      setManagementImages(mgmtImgMap);

      // Load patient (always) and hospital (only if hospital_id exists)
      const p = await patientService.getById(c.patient_id);
      if (p) setPatient(p);

      if (c.hospital_id) {
        const h = await hospitalService.getById(c.hospital_id);
        if (h) setHospital(h);
      }
    } finally {
      setLoadingData(false);
    }
  }, [id]);

  useEffect(() => { reloadCase(); }, [reloadCase]);
  // ──────────────────────────────────────────────────────────────────────────
  const [showExport, setShowExport] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activePill, setActivePill] = useState('patientInfo');

  // Expanded states
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [expandedSubs, setExpandedSubs] = useState<string[]>([]);
  const [editingSections, setEditingSections] = useState<string[]>([]);

  // Editable field values
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editProvisional, setEditProvisional] = useState('');
  const [editFinal, setEditFinal] = useState('');
  const [editChief, setEditChief] = useState('');
  const [editPresent, setEditPresent] = useState('');
  const [editPast, setEditPast] = useState('');
  const [editAllergies, setEditAllergies] = useState('');
  const [editMeds, setEditMeds] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showAddInvestigation, setShowAddInvestigation] = useState(false);
  const [showAddManagement, setShowAddManagement] = useState(false);
  const [showAddProgress, setShowAddProgress] = useState(false);
  const [editInvestigation, setEditInvestigation] = useState<any>(null);
  const [editManagement, setEditManagement] = useState<any>(null);
  const [editProgress, setEditProgress] = useState<any>(null);
  const [showDischargeDialog, setShowDischargeDialog] = useState(false);
  const [dischargeDate, setDischargeDate] = useState<Date>(new Date());
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [dischargeOutcome, setDischargeOutcome] = useState<string | null>(null);
  const [caseStatus, setCaseStatus] = useState<'active' | 'discharged'>('active');
  const [outcomeDropdownOpen, setOutcomeDropdownOpen] = useState(false);

  const toggleEdit = (key: string) => {
    setEditingSections(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);
  };

  const saveSection = async (key: string) => {
    if (!id) return;
    try {
      if (key === 'classification') {
        await caseService.update(id, { specialty: editSpecialty, provisional_diagnosis: editProvisional, final_diagnosis: editFinal, chief_complaint: editChief });
      } else if (key === 'history') {
        await caseService.update(id, { chief_complaint: editChief, present_history: editPresent, past_medical_history: editPast, allergies: editAllergies, current_medications: editMeds });
      }
      toast.success('Saved');
      toggleEdit(key);
      reloadCase();
    } catch {
      toast.error('Failed to save');
    }
  };

  // Section refs
  const sectionRefs: Record<string, React.RefObject<HTMLDivElement>> = {
    patientInfo: useRef<HTMLDivElement>(null),
    classification: useRef<HTMLDivElement>(null),
    history: useRef<HTMLDivElement>(null),
    investigations: useRef<HTMLDivElement>(null),
    management: useRef<HTMLDivElement>(null),
    progress: useRef<HTMLDivElement>(null),
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);
  };

  const toggleSub = (key: string) => {
    setExpandedSubs(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);
  };

  const handlePillClick = useCallback((key: string) => {
    setExpandedSections(prev => prev.includes(key) ? prev : [...prev, key]);
    setActivePill(key);
    setTimeout(() => {
      const ref = sectionRefs[key];
      if (ref?.current) {
        const offset = 110;
        const top = ref.current.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }, 100);
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    navPills.forEach(({ key }) => {
      const ref = sectionRefs[key];
      if (ref?.current) {
        const observer = new IntersectionObserver(
          ([entry]) => { if (entry.isIntersecting) setActivePill(key); },
          { rootMargin: '-120px 0px -60% 0px', threshold: 0 }
        );
        observer.observe(ref.current);
        observers.push(observer);
      }
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  const handleDelete = async () => {
    setShowDeleteDialog(false);
    if (!id) return;
    try {
      await caseService.delete(id);
      toast.success('Case deleted');
      navigate(-1);
    } catch {
      toast.error('Failed to delete case');
    }
  };

  const exportData = [{ field: 'Case', value: caseData?.provisional_diagnosis ?? '', date: caseData?.admission_date ?? '' }];

  const caseExportData = {
    patient: patient ? {
      name: patient.full_name,
      dob: patient.dob,
      gender: patient.gender,
      fileNumber: patient.file_number ?? '',
      hospital: hospital?.name ?? '',
      admissionDate: caseData?.admission_date ?? '',
      dischargeDate: caseData?.discharge_date,
      outcome: caseData?.discharge_outcome,
    } : undefined,
    classification: {
      specialty: caseData?.specialty ?? '',
      provisional: caseData?.provisional_diagnosis ?? '',
      final: caseData?.final_diagnosis ?? '',
      chiefComplaint: caseData?.chief_complaint ?? '',
    },
    history: {
      chiefComplaint: caseData?.chief_complaint ?? '',
      presentHistory: caseData?.present_history ?? '',
      pastHistory: caseData?.past_medical_history ?? '',
      allergies: caseData?.allergies ?? '',
      medications: caseData?.current_medications ?? '',
    },
    investigations: investigations.map(inv => ({
      name: inv.name,
      type: inv.type,
      date: inv.date,
      result: inv.result ?? '',
      images: (investigationImages[inv.id] || []).map(img => img.full_path),
    })),
    management: managementEntries.map(m => ({
      type: m.type,
      date: m.date,
      content: m.content ?? '',
      mode: m.mode,
      details: m.details,
    })),
    progressNotes: progressNotes.map(n => ({
      date: n.date,
      assessment: n.assessment ?? '',
      hr: n.vitals?.hr?.toString(),
      spo2: n.vitals?.spo2?.toString(),
      temp: n.vitals?.temp?.toString(),
      rr: n.vitals?.rr?.toString(),
      bp: n.vitals?.bp_systolic ? `${n.vitals.bp_systolic}/${n.vitals.bp_diastolic}` : undefined,
      weight: n.vitals?.weight?.toString(),
    })),
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 pb-3 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[16px] font-bold text-foreground">Case Details</h1>
        <div className="flex gap-1">
          <button onClick={() => setShowExport(true)} className="p-2 rounded-full hover:bg-muted transition-colors" style={{ color: '#2563EB' }}>
            <Upload size={18} />
          </button>
          <button onClick={() => navigate(`/case/${id}/pearl`, { state: { caseData } })} className="p-2 rounded-full hover:bg-muted transition-colors" style={{ color: '#D97706' }}>
            <Lightbulb size={18} />
          </button>
          <button
            onClick={() => caseStatus !== 'discharged' && setShowDischargeDialog(true)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            style={{ color: caseStatus === 'discharged' ? '#94A3B8' : '#10B981', cursor: caseStatus === 'discharged' ? 'default' : 'pointer' }}
            disabled={caseStatus === 'discharged'}
          >
            <LogOut size={18} />
          </button>
          <button onClick={() => setShowDeleteDialog(true)} className="p-2 rounded-full hover:bg-muted text-destructive">
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      {/* Quick Navigation Bar */}
      <div className="sticky top-[52px] z-40 px-4 py-2.5 overflow-x-auto no-scrollbar flex gap-2" style={{ background: '#F0F4F8' }}>
        {navPills.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handlePillClick(key)}
            className="flex-shrink-0 text-[13px] font-semibold transition-colors"
            style={{
              padding: '8px 14px', borderRadius: '20px',
              background: activePill === key ? '#2563EB' : '#FFFFFF',
              color: activePill === key ? '#FFFFFF' : '#6B7C93',
              border: activePill === key ? 'none' : '1.5px solid #DDE3EA',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-5 py-5 pb-10">
        {/* Patient Info Card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card" style={{ marginBottom: '16px' }}>
          <div className="h-1 w-full gradient-brand" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-avatar flex items-center justify-center text-primary-foreground font-bold text-[16px] flex-shrink-0">
              {patient?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              {/* Patient Name */}
              <h3 className="text-[16px] font-bold text-foreground truncate">{patient?.full_name ?? 'Unknown'}</h3>
              {/* File Number */}
              {patient?.file_number && (
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  📋 {patient.file_number}
                </p>
              )}
              {/* Admission Date */}
              <p className="text-[12px] text-muted-foreground mt-0.5">
                🏥 Admitted: {caseData?.admission_date ? new Date(caseData.admission_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </p>
              {/* Discharge Date — only if discharged */}
              {caseData?.status === 'discharged' && caseData?.discharge_date && (
                <p className="text-[12px] mt-0.5" style={{ color: '#16A34A' }}>
                  ✅ Discharged: {new Date(caseData.discharge_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {caseData.discharge_outcome ? ` — ${caseData.discharge_outcome}` : ''}
                </p>
              )}
            </div>
            {/* Status badge */}
            <div className="flex-shrink-0">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                caseData?.status === 'active'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {caseData?.status ?? 'active'}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 1 — Patient Information */}
        <AccordionSection
          icon="📋" title="Patient Information"
          isExpanded={expandedSections.includes('patientInfo')}
          onToggle={() => toggleSection('patientInfo')}
          sectionRef={sectionRefs.patientInfo}
          onEdit={() => navigate(`/patient/${caseData?.patient_id}/edit`)}
          isEditing={false}
        >
          <DisplayField
                  fontSize={cs.body}
                  label="Full Name (English)" value={patient?.full_name ?? 'Unknown'} />
          <div className="space-y-1.5">
            <span style={{ color: '#6B7C93', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Date of Birth
            </span>
            <div className="flex gap-2">
              {(() => {
                const dob = patient?.dob ? patient.dob.split('-') : ['', '', ''];
                return [dob[2], dob[1], dob[0]].map((v, i) => (
                  <div key={i} style={{
                    background: '#F8FAFC', border: '1.5px solid #DDE3EA', borderRadius: '12px',
                    padding: '12px 16px', color: '#1A2332', fontSize: '15px', flex: i === 2 ? 2 : 1, textAlign: 'center',
                  }}>
                    {v || '—'}
                  </div>
                ));
              })()}
            </div>
          </div>
          <div className="space-y-1.5">
            <span style={{ color: '#6B7C93', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Gender
            </span>
            <GenderPill gender={patient?.gender ?? ''} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DisplayField
                  fontSize={cs.body}
                  label="File Number" value={patient?.file_number ?? ''} />
            <DisplayField
                  fontSize={cs.body}
                  label="Hospital" value={hospital?.name ?? ''} />
          </div>
          <DisplayField
                  fontSize={cs.body}
                  label="Admission Date" value={caseData?.admission_date ?? ''} />
        </AccordionSection>

        {/* SECTION 2 — Classification */}
        <AccordionSection
          icon="🩺" title="Classification"
          isExpanded={expandedSections.includes('classification')}
          onToggle={() => toggleSection('classification')}
          sectionRef={sectionRefs.classification}
          onEdit={() => editingSections.includes('classification') ? saveSection('classification') : toggleEdit('classification')}
          isEditing={editingSections.includes('classification')}
        >
          {editingSections.includes('classification') ? (
            <div className="space-y-1.5">
              <span style={{ color: '#6B7C93', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Specialty</span>
              <Select value={editSpecialty} onValueChange={setEditSpecialty}>
                <SelectTrigger className="w-full h-12 bg-white border-[1.5px] border-primary rounded-xl text-[14px]">
                  <SelectValue placeholder="Select specialty..." />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map(s => (
                    <SelectItem key={s} value={s.toLowerCase().replace(/ /g, '-')}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <DisplayField
                  fontSize={cs.body}
                  label="Specialty" value={editSpecialty} />
          )}
          <DisplayField
                  fontSize={cs.body}
                  label="Provisional Diagnosis" value={editProvisional} isMultiLine isEditing={editingSections.includes('classification')} onChange={setEditProvisional} />
          <DisplayField
                  fontSize={cs.body}
                  label="Final Diagnosis" value={editFinal} isMultiLine isEditing={editingSections.includes('classification')} onChange={setEditFinal} />
          <DisplayField
                  fontSize={cs.body}
                  label="Chief Complaint" value={editChief} isEditing={editingSections.includes('classification')} onChange={setEditChief} />
          {editingSections.includes('classification') && (
            <button onClick={() => saveSection('classification')}
              style={{ width: '100%', marginTop: 8, height: 44, borderRadius: 12, background: '#2563EB', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              Save Changes
            </button>
          )}
        </AccordionSection>

        {/* SECTION 3 — Patient History */}
        <AccordionSection
          icon="📄" title="Patient History"
          isExpanded={expandedSections.includes('history')}
          onToggle={() => toggleSection('history')}
          sectionRef={sectionRefs.history}
          onEdit={() => editingSections.includes('history') ? saveSection('history') : toggleEdit('history')}
          isEditing={editingSections.includes('history')}
        >
          <DisplayField
                  fontSize={cs.body}
                  label="Chief Complaint" value={editChief} isMultiLine isEditing={editingSections.includes('history')} onChange={setEditChief} />
          <DisplayField
                  fontSize={cs.body}
                  label="Present History" value={editPresent} isMultiLine isEditing={editingSections.includes('history')} onChange={setEditPresent} />
          <DisplayField
                  fontSize={cs.body}
                  label="Past Medical History" value={editPast} isMultiLine isEditing={editingSections.includes('history')} onChange={setEditPast} />
          <DisplayField
                  fontSize={cs.body}
                  label="Allergies" value={editAllergies} isEditing={editingSections.includes('history')} onChange={setEditAllergies} />
          <DisplayField
                  fontSize={cs.body}
                  label="Current Medications (Pre-Admission)" value={editMeds} isMultiLine isEditing={editingSections.includes('history')} onChange={setEditMeds} />
          {editingSections.includes('history') && (
            <button onClick={() => saveSection('history')}
              style={{ width: '100%', marginTop: 8, height: 44, borderRadius: 12, background: '#2563EB', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              Save Changes
            </button>
          )}
        </AccordionSection>

        {/* SECTION 4 — Investigations */}
        <AccordionSection
          icon="🔬" title="Investigations"
          isExpanded={expandedSections.includes('investigations')}
          onToggle={() => toggleSection('investigations')}
          sectionRef={sectionRefs.investigations}
          onAdd={() => setShowAddInvestigation(true)}
        >
          {/* UI LOGIC — Investigation Cards
              Render one card per investigation record.
              Each card is independently expandable.
              All cards collapsed by default.
              ✏️ icon appears only when card is expanded.
              Image thumbnails hidden if no images attached.
              END UI LOGIC */}
          {/* BACKEND LOGIC — Investigations Data
              Fetch all investigations where
              investigation.case_id = current case ID
              Order by investigation.date DESC
              Each card maps to one investigation record.
              END BACKEND LOGIC */}
          {(investigations || []).map((inv) => {
            const isCardExpanded = expandedSubs.includes(`inv-${inv.id}`);
            const typeIcon = inv.type === 'Lab Result' ? '🧪' : inv.type === 'Imaging' ? '🩻' : '📄';
            return (
              <div key={inv.id}
                onClick={() => toggleSub(`inv-${inv.id}`)}
                className="cursor-pointer active:opacity-95 transition-opacity"
                style={{
                  background: '#FFFFFF', borderRadius: '14px', border: '1px solid #DDE3EA',
                  padding: '12px 16px', marginBottom: '10px',
                  boxShadow: '0px 1px 4px rgba(0,0,0,0.06)',
                }}>
                {/* Card header */}
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#1A2332' }}>{inv.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: '12px', color: '#6B7C93', fontWeight: 600 }}>{inv.type === 'Lab Result' ? 'Lab' : inv.type}</span>
                    <span style={{ fontSize: '16px' }}>{typeIcon}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span style={{ fontSize: '12px', color: '#6B7C93' }}>{inv.date}</span>
                  <div className="flex items-center gap-1">
                    {isCardExpanded && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); setEditInvestigation({ id: inv.id, name: inv.name, type: inv.type, date: inv.date, result: inv.result }); }} className="p-1 rounded-full hover:bg-muted/50">
                          <Pencil size={14} style={{ color: '#2563EB' }} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(`inv-${inv.id}`); }} className="p-1 rounded-full hover:bg-muted/50">
                          <Trash2 size={14} style={{ color: '#EF4444' }} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #DDE3EA', margin: '8px 0' }} />

                {!isCardExpanded ? (
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: '13px', color: '#1A2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {inv.result || '—'}
                    </span>
                    <ChevronDown size={14} className="text-muted-foreground ml-2 flex-shrink-0" />
                  </div>
                ) : (
                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-1.5">
                      <span style={{ color: '#6B7C93', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Result
                      </span>
                      <div style={{
                        background: '#F8FAFC', border: '1.5px solid #DDE3EA', borderRadius: '12px',
                        padding: '12px 16px', color: '#1A2332', fontSize: '15px', lineHeight: '1.5', minHeight: '60px',
                      }}>
                        {inv.result || '—'}
                      </div>
                    </div>

                    {(investigationImages[inv.id] || []).length > 0 && (
                      <div className="space-y-1.5">
                        <span style={{ color: '#6B7C93', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Attached Images
                        </span>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                          {(investigationImages[inv.id] || []).slice(0, 3).map((img, i) => (
                            <div key={i}
                              onClick={() => setFullscreenImg(img.full_path)}
                              style={{
                                width: '72px', height: '72px', borderRadius: '10px',
                                background: '#F1F5F9', overflow: 'hidden', flexShrink: 0, cursor: 'pointer',
                              }}>
                              <img src={img.thumbnail_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ))}
                          {(investigationImages[inv.id] || []).length > 3 && (
                            <div
                              onClick={() => setFullscreenImg((investigationImages[inv.id] || [])[3]?.full_path ?? null)}
                              style={{
                                width: '72px', height: '72px', borderRadius: '10px',
                                background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                fontSize: '13px', fontWeight: 700, color: '#6B7C93', cursor: 'pointer',
                              }}>
                              +{(investigationImages[inv.id] || []).length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end" onClick={() => toggleSub(`inv-${inv.id}`)}>
                      <ChevronUp size={14} className="text-muted-foreground cursor-pointer" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </AccordionSection>

        {/* SECTION 5 — Management */}
        <AccordionSection
          icon="⚕️" title="Management"
          isExpanded={expandedSections.includes('management')}
          onToggle={() => toggleSection('management')}
          sectionRef={sectionRefs.management}
          onAdd={() => setShowAddManagement(true)}
        >
          {/* UI LOGIC — Management Cards
              Render one card per management entry.
              Each card is independently expandable.
              All cards collapsed by default.
              ✏️ icon appears only when card is expanded.
              END UI LOGIC */}
          {/* BACKEND LOGIC — Management Data
              Fetch all management entries where management.case_id = current case ID
              Order by management.date DESC
              Each card maps to one management record.
              END BACKEND LOGIC */}
          {(managementEntries || []).map((entry) => {
            const isCardExpanded = expandedSubs.includes(`mgmt-${entry.id}`);
            const typeIcon = entry.type === 'Medications' ? '💊' : entry.type === 'Respiratory Support' ? '🫁' : '🍼';
            return (
              <div key={entry.id}
                onClick={() => toggleSub(`mgmt-${entry.id}`)}
                className="cursor-pointer active:opacity-95 transition-opacity"
                style={{
                  background: '#FFFFFF', borderRadius: '14px', border: '1px solid #DDE3EA',
                  padding: '12px 16px', marginBottom: '10px',
                  boxShadow: '0px 1px 4px rgba(0,0,0,0.06)',
                }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '16px' }}>{typeIcon}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1A2332' }}>{entry.type}</span>
                  </div>
                  {isCardExpanded && (
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setEditManagement({ id: entry.id, type: entry.type, content: entry.content, mode: entry.mode ?? '', details: entry.details ?? '', existingImages: managementImages[entry.id] ?? [] }); }} className="p-1 rounded-full hover:bg-muted/50">
                        <Pencil size={14} style={{ color: '#2563EB' }} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(`mgmt-${entry.id}`); }} className="p-1 rounded-full hover:bg-muted/50">
                        <Trash2 size={14} style={{ color: '#EF4444' }} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span style={{ fontSize: '12px', color: '#6B7C93' }}>{entry.date}</span>
                  <ChevronDown size={14} className="text-muted-foreground transition-transform duration-300"
                    style={{ transform: isCardExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </div>

                {isCardExpanded && (
                  <>
                    <div style={{ borderTop: '1px solid #DDE3EA', margin: '8px 0' }} />
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      {entry.type === 'Medications' && (
                        <div className="space-y-1.5">
                          <span style={{ color: '#6B7C93', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Medications List
                          </span>
                          <div style={{ background: '#F8FAFC', border: '1.5px solid #DDE3EA', borderRadius: '12px', padding: '12px 16px', color: '#1A2332', fontSize: '15px', lineHeight: '1.8' }}>
                            {entry.content
                              ? entry.content.split('\n').map((med, i) => <div key={i}>{i + 1}. {med}</div>)
                              : '—'}
                          </div>
                        </div>
                      )}
                      {entry.type === 'Respiratory Support' && (
                        <>
                          <div className="space-y-1.5">
                            <span style={{ color: '#6B7C93', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selected Mode</span>
                            <div>
                              <span style={{ display: 'inline-flex', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 600, background: '#2563EB', color: '#FFFFFF' }}>
                                {entry.mode || '—'}
                              </span>
                            </div>
                          </div>
                          <DisplayField
                  fontSize={cs.body}
                  label="Details" value={entry.details ?? ''} />
                        </>
                      )}
                      {entry.type === 'Infant Feeding' && (
                        <>
                          <div className="space-y-1.5">
                            <span style={{ color: '#6B7C93', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selected Mode</span>
                            <div>
                              <span style={{ display: 'inline-flex', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 600, background: '#2563EB', color: '#FFFFFF' }}>
                                {entry.mode || '—'}
                              </span>
                            </div>
                          </div>
                          <DisplayField
                  fontSize={cs.body}
                  label="Feeding Details" value={entry.details ?? ''} />
                        </>
                      )}
                      {/* Chart images attached to this management entry */}
                      {managementImages[entry.id] && managementImages[entry.id].length > 0 && (
                        <div className="space-y-1.5">
                          <span style={{ color: '#6B7C93', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Attached Charts
                          </span>
                          <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            {managementImages[entry.id].map((imgUrl, i) => (
                              <div key={i}
                                onClick={() => setFullscreenImg(imgUrl)}
                                style={{ width: '72px', height: '72px', borderRadius: '10px', background: '#F1F5F9', overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}>
                                <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </AccordionSection>

        {/* SECTION 6 — Progress Note */}
        <AccordionSection
          icon="📝" title="Progress Note"
          isExpanded={expandedSections.includes('progress')}
          onToggle={() => toggleSection('progress')}
          sectionRef={sectionRefs.progress}
          onAdd={() => setShowAddProgress(true)}
        >
          {/* UI LOGIC — Progress Note Cards
              Render one card per progress note entry.
              Each card is independently expandable.
              Each card has its own nested Vital Signs.
              All cards and nested vitals collapsed by default.
              ✏️ icon appears only when card is expanded.
              END UI LOGIC */}
          {/* BACKEND LOGIC — Progress Note Data
              Fetch all progress notes where progress_note.case_id = current case ID
              Order by progress_note.date DESC
              Each card maps to one progress_note record.
              Vital Signs fetched from vitals table where vitals.progress_note_id = progress_note.id
              END BACKEND LOGIC */}
          {(progressNotes || []).map((note) => {
            const isCardExpanded = expandedSubs.includes(`prog-${note.id}`);
            return (
              <div key={note.id}
                onClick={() => toggleSub(`prog-${note.id}`)}
                className="cursor-pointer active:opacity-95 transition-opacity"
                style={{
                  background: '#FFFFFF', borderRadius: '14px', border: '1px solid #DDE3EA',
                  padding: '12px 16px', marginBottom: '10px',
                  boxShadow: '0px 1px 4px rgba(0,0,0,0.06)',
                }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '16px' }}>📝</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1A2332' }}>Progress Note</span>
                  </div>
                  {isCardExpanded && (
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setEditProgress({
                        id: note.id,
                        date: note.date,
                        assessment: note.assessment,
                        vitals: note.vitals ? {
                          hr: note.vitals.hr?.toString() ?? '',
                          spo2: note.vitals.spo2?.toString() ?? '',
                          temp: note.vitals.temp?.toString() ?? '',
                          rr: note.vitals.rr?.toString() ?? '',
                          bp: note.vitals.bp_systolic && note.vitals.bp_diastolic ? `${note.vitals.bp_systolic}/${note.vitals.bp_diastolic}` : '',
                          weight: note.vitals.weight?.toString() ?? '',
                        } : undefined
                      }); }} className="p-1 rounded-full hover:bg-muted/50">
                        <Pencil size={14} style={{ color: '#2563EB' }} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(`prog-${note.id}`); }} className="p-1 rounded-full hover:bg-muted/50">
                        <Trash2 size={14} style={{ color: '#EF4444' }} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span style={{ fontSize: '12px', color: '#6B7C93' }}>{note.date}</span>
                  <ChevronDown size={14} className="text-muted-foreground transition-transform duration-300"
                    style={{ transform: isCardExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </div>

                {isCardExpanded && (
                  <>
                    <div style={{ borderTop: '1px solid #DDE3EA', margin: '8px 0' }} />
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <DisplayField
                  fontSize={cs.body}
                  label="Assessment" value={note.assessment} isMultiLine />

                      {/* Nested Vital Signs */}
                      <div
                        onClick={() => toggleSub(`vitals-${note.id}`)}
                        className="cursor-pointer active:opacity-95 transition-opacity"
                        style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #DDE3EA', overflow: 'hidden' }}
                      >
                        <div className="flex items-center justify-between hover:bg-muted/30 transition-colors" style={{ padding: '12px' }}>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: '14px' }}>🫀</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1A2332' }}>Vital Signs</span>
                          </div>
                          <ChevronDown size={16} className="text-muted-foreground transition-transform duration-300"
                            style={{ transform: expandedSubs.includes(`vitals-${note.id}`) ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        </div>
                        {expandedSubs.includes(`vitals-${note.id}`) && (
                          <div onClick={(e) => e.stopPropagation()} style={{ padding: '0 12px 12px 12px', borderTop: '1px solid #DDE3EA' }} className="space-y-3 pt-3">
                            <div className="grid grid-cols-2 gap-3">
                              <DisplayField
                  fontSize={cs.body}
                  label="HR (BPM)" value={note.vitals.hr} />
                              <DisplayField
                  fontSize={cs.body}
                  label="SPO₂ (%)" value={note.vitals.spo2} />
                              <DisplayField
                  fontSize={cs.body}
                  label="TEMP (°C)" value={note.vitals.temp} />
                              <DisplayField
                  fontSize={cs.body}
                  label="RR (/MIN)" value={note.vitals.rr} />
                              <DisplayField
                  fontSize={cs.body}
                  label="BP (MMHG)" value={note.vitals.bp} />
                              <DisplayField
                  fontSize={cs.body}
                  label="WEIGHT (KG)" value={note.vitals.weight} />
                            </div>
                            <DisplayField
                  fontSize={cs.body}
                  label="Date & Time" value={note.vitals.dateTime} />
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </AccordionSection>

        {/* Media Section */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-[14px]">📸</span>
              <span className="text-[13px] font-bold text-foreground">Media ({caseMediaList.length})</span>
            </div>
            <button onClick={() => navigate(`/case/${id}/media`)} className="text-[12px] text-primary font-medium">
              View All
            </button>
          </div>
          <div className="p-4 flex gap-3 overflow-x-auto no-scrollbar">
            {caseMediaList.slice(0, 4).map(m => (
              <div key={m.id}
                onClick={() => setFullscreenImg(m.dataUrl)}
                className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                {m.dataUrl
                  ? <img src={m.dataUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-muted flex items-center justify-center"><Image size={20} className="text-muted-foreground" /></div>
                }
              </div>
            ))}
            <button
              onClick={() => navigate(`/case/${id}/media`)}
              className="w-20 h-20 flex-shrink-0 bg-muted/50 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Camera size={20} />
              <span className="text-[9px] font-bold mt-1">ADD</span>
            </button>
          </div>
        </div>
      </div>

      {/* Export Sheet */}
      <CaseExportSheet
        open={showExport}
        onOpenChange={setShowExport}
        title="Case"
        caseExportData={caseExportData}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this case? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Card Confirmation — Custom styled */}
      {!!deleteTarget && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="absolute inset-0 flex items-center justify-center px-8">
            <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '24px', width: '100%', maxWidth: '340px' }}>
              <div className="flex flex-col items-center text-center space-y-2">
                <Trash2 size={28} style={{ color: '#EF4444' }} />
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#1A2332' }}>Delete this record?</span>
                <span style={{ fontSize: '13px', color: '#6B7C93' }}>This action cannot be undone.</span>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setDeleteTarget(null)}
                  style={{ flex: 1, height: '48px', borderRadius: '12px', border: '1.5px solid #6B7C93', background: '#FFFFFF', color: '#6B7C93', fontSize: '15px', fontWeight: 600 }}>
                  Cancel
                </button>
                <button onClick={async () => {
                  if (!deleteTarget) return;
                  try {
                    if (deleteTarget.startsWith('inv-')) {
                      await investigationService.delete(deleteTarget.replace('inv-', ''));
                      toast.success('Investigation deleted');
                    } else if (deleteTarget.startsWith('mgmt-')) {
                      await managementService.delete(deleteTarget.replace('mgmt-', ''));
                      toast.success('Entry deleted');
                    } else if (deleteTarget.startsWith('prog-')) {
                      await progressNoteService.delete(deleteTarget.replace('prog-', ''));
                      toast.success('Progress note deleted');
                    }
                    setDeleteTarget(null);
                    reloadCase();
                  } catch {
                    toast.error('Failed to delete');
                    setDeleteTarget(null);
                  }
                }}
                  style={{ flex: 1, height: '48px', borderRadius: '12px', border: 'none', background: '#EF4444', color: '#FFFFFF', fontSize: '15px', fontWeight: 600 }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheets — Add */}
      <AddInvestigationSheet open={showAddInvestigation} onClose={() => setShowAddInvestigation(false)} onSave={async (data) => {
        if (!id) return;
        const inv = await investigationService.create(id, { name: data.name, type: data.type, date: data.date, result: data.result });
        // Save images to investigation_images AND media (so they appear in Media section)
        if (data.images && data.images.length > 0) {
          const { mediaService } = await import('@/services/mediaService');
          for (const img of data.images) {
            await investigationService.addImageFromDataUrl(inv.id, img.dataUrl, img.name);
            // Also add to case media so it appears in Media gallery
            const checksum = btoa(img.name + img.dataUrl.length).slice(0, 32);
            await mediaService.add(id, img.dataUrl, img.dataUrl, checksum);
          }
        }
        toast.success('Investigation added'); setShowAddInvestigation(false); reloadCase();
      }} />
      <AddManagementSheet open={showAddManagement} onClose={() => setShowAddManagement(false)} onSave={async (data) => {
        if (!id) return;
        const content = data.content ?? (Array.isArray(data.medications) ? data.medications.join('\n') : data.medications) ?? '';
        const entry = await managementService.create(id, { type: data.type, content, mode: data.mode, details: data.details, date: data.date ?? new Date().toISOString().split('T')[0] });
        // Save chart images to case media with management entry id as checksum prefix
        if (data.images && data.images.length > 0) {
          const { mediaService } = await import('@/services/mediaService');
          for (const img of data.images) {
            const checksum = `mgmt_${entry.id}_${btoa(img.name).slice(0,16)}`;
            await mediaService.add(id, img.dataUrl, img.dataUrl, checksum);
          }
        }
        toast.success('Management entry added'); setShowAddManagement(false); reloadCase();
      }} />
      <AddProgressNoteSheet open={showAddProgress} onClose={() => setShowAddProgress(false)} onSave={async (data) => {
        if (!id) return;
        await progressNoteService.create(id, { date: data.date ?? new Date().toISOString().split('T')[0], assessment: data.assessment, vitals: data.vitals });
        toast.success('Progress note added'); setShowAddProgress(false); reloadCase();
      }} />

      {/* Bottom Sheets — Edit (pre-filled) */}
      <AddInvestigationSheet open={!!editInvestigation} onClose={() => setEditInvestigation(null)} onSave={async (data) => {
        if (!editInvestigation) return;
        await investigationService.update(editInvestigation.id, { name: data.name, type: data.type, date: data.date, result: data.result });
        // Save any newly attached images to both investigation_images AND media
        if (data.images && data.images.length > 0) {
          const { mediaService } = await import('@/services/mediaService');
          for (const img of data.images) {
            await investigationService.addImageFromDataUrl(editInvestigation.id, img.dataUrl, img.name);
            const checksum = btoa(img.name + img.dataUrl.length).slice(0, 32);
            await mediaService.add(id!, img.dataUrl, img.dataUrl, checksum);
          }
        }
        toast.success('Investigation updated'); setEditInvestigation(null); reloadCase();
      }} initialData={editInvestigation} />
      <AddManagementSheet open={!!editManagement} onClose={() => setEditManagement(null)} onSave={async (data) => {
        if (!editManagement) return;
        const content = data.content ?? (Array.isArray(data.medications) ? data.medications.join('\n') : data.medications) ?? '';
        await managementService.update(editManagement.id, { type: data.type, content, mode: data.mode, details: data.details });
        // Only save NEW images (not existing ones that start with 'existing_')
        const newImages = (data.images || []).filter((img: any) => !img.name.startsWith('existing_'));
        if (newImages.length > 0) {
          const { mediaService } = await import('@/services/mediaService');
          for (const img of newImages) {
            const checksum = `mgmt_${editManagement.id}_${btoa(img.name).slice(0,16)}`;
            await mediaService.add(id!, img.dataUrl, img.dataUrl, checksum);
          }
        }
        toast.success('Management updated'); setEditManagement(null); reloadCase();
      }} initialData={editManagement} />
      <AddProgressNoteSheet open={!!editProgress} onClose={() => setEditProgress(null)} onSave={async (data) => {
        if (!editProgress) return;
        await progressNoteService.update(editProgress.id, { date: data.date, assessment: data.assessment, vitals: data.vitals });
        toast.success('Progress note updated'); setEditProgress(null); reloadCase();
      }} initialData={editProgress} />

      {/* Discharge Dialog */}
      {showDischargeDialog && (() => {
        const outcomes = [
          { key: 'cured', label: 'Cured / Recovered' },
          { key: 'followup', label: 'Follow Up Required' },
          { key: 'referred', label: 'Referred to Specialist' },
          { key: 'transferred', label: 'Transferred to Another Hospital' },
          { key: 'lama', label: 'Left Against Medical Advice (LAMA)' },
          { key: 'chronic', label: 'Chronic / Ongoing Management' },
          { key: 'homecare', label: 'Discharged with Home Care' },
          { key: 'died', label: 'Died' },
        ];
        const isValid = !!dischargeDate && !!dischargeOutcome;
        return (
          <>
            <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowDischargeDialog(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '20px', width: '100%', maxWidth: '360px' }}>
                <div className="flex items-center gap-2 mb-1">
                  <LogOut size={20} style={{ color: '#10B981' }} />
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#1A2332' }}>Discharge Patient</span>
                </div>
                <span style={{ fontSize: '13px', color: '#6B7C93' }}>{patient?.full_name ?? 'Unknown'}</span>

                <div className="h-px my-4" style={{ backgroundColor: '#F0F4F8' }} />

                <div className="space-y-4">
                  {/* Date */}
                  <div className="space-y-1.5">
                    <span style={{ color: '#6B7C93', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Discharge Date *
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full h-11 px-4 border rounded-xl text-[14px] text-left flex items-center justify-between" style={{ borderColor: '#DDE3EA', background: '#FFFFFF', color: '#1A2332' }}>
                          {dischargeDate ? format(dischargeDate, 'MM/dd/yyyy') : 'mm/dd/yyyy'}
                          <CalendarDays size={16} style={{ color: '#94A3B8' }} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dischargeDate} onSelect={(d) => d && setDischargeDate(d)} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Outcome */}
                  <div className="space-y-1.5 relative">
                    <span style={{ color: '#6B7C93', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Outcome *
                    </span>
                    <button
                      onClick={() => setOutcomeDropdownOpen(prev => !prev)}
                      className="w-full flex items-center justify-between text-left transition-all"
                      style={{
                        height: 48, padding: '0 16px', borderRadius: '12px',
                        border: outcomeDropdownOpen ? '1.5px solid #2563EB' : '1.5px solid #DDE3EA',
                        background: '#F8FAFC', fontSize: '14px',
                        color: dischargeOutcome ? '#1A2332' : '#94A3B8',
                      }}
                    >
                      {outcomes.find(o => o.key === dischargeOutcome)?.label || 'Select outcome...'}
                      <ChevronDown size={16} style={{ color: '#94A3B8', transform: outcomeDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                    </button>
                    {outcomeDropdownOpen && (
                      <div style={{ background: '#FFFFFF', border: '1.5px solid #DDE3EA', borderRadius: '12px', boxShadow: '0px 4px 12px rgba(0,0,0,0.10)', maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                        {outcomes.map(o => (
                          <button
                            key={o.key}
                            onClick={() => { setDischargeOutcome(o.key); setOutcomeDropdownOpen(false); }}
                            className="w-full text-left transition-colors"
                            style={{
                              height: 44, padding: '0 16px', display: 'flex', alignItems: 'center',
                              background: dischargeOutcome === o.key ? '#EFF6FF' : 'transparent',
                              color: dischargeOutcome === o.key ? '#2563EB' : '#1A2332',
                              fontWeight: dischargeOutcome === o.key ? 700 : 400, fontSize: '13px',
                            }}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <span style={{ color: '#6B7C93', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Discharge Notes (optional)
                    </span>
                    <textarea
                      value={dischargeNotes}
                      onChange={(e) => setDischargeNotes(e.target.value)}
                      placeholder="e.g. condition on discharge..."
                      rows={3}
                      className="w-full px-4 py-3 border rounded-xl text-[14px] placeholder:text-muted-foreground focus:outline-none resize-none"
                      style={{ borderColor: '#DDE3EA', color: '#1A2332' }}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => { setShowDischargeDialog(false); setDischargeOutcome(null); setDischargeNotes(''); }}
                    style={{ border: '1.5px solid #DDE3EA', color: '#6B7C93', borderRadius: '12px', height: '48px', fontWeight: 600, fontSize: '14px', background: '#FFFFFF' }}
                    className="flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!isValid}
                    onClick={async () => {
                      if (!id || !dischargeDate || !dischargeOutcome) return;
                      try {
                        const dischargeDateStr = dischargeDate.toISOString().split('T')[0];
                        await caseService.discharge(id, {
                          discharge_date: dischargeDateStr,
                          discharge_outcome: dischargeOutcome,
                          discharge_notes: dischargeNotes,
                        });
                        // Auto-add discharge progress note
                        const outcomeLabels: Record<string, string> = {
                          cured: 'Cured', followup: 'Follow Up', referred: 'Referred',
                          transferred: 'Transferred', lama: 'LAMA', chronic: 'Chronic',
                          homecare: 'Home Care', died: 'Died',
                        };
                        await progressNoteService.create(id, {
                          date: dischargeDateStr,
                          assessment: `Patient discharged — Outcome: ${outcomeLabels[dischargeOutcome] ?? dischargeOutcome}${dischargeNotes ? `\n\nDischarge notes: ${dischargeNotes}` : ''}`,
                        });
                        toast.success('Patient discharged successfully');
                        setCaseStatus('discharged');
                        reloadCase();
                      } catch {
                        toast.error('Failed to discharge patient');
                      }
                      setShowDischargeDialog(false);
                      setDischargeOutcome(null);
                      setDischargeNotes('');
                    }}
                    style={{
                      background: isValid ? '#10B981' : '#D1D5DB',
                      color: isValid ? '#FFFFFF' : '#9CA3AF',
                      borderRadius: '12px', height: '48px', fontWeight: 600, fontSize: '14px',
                      cursor: isValid ? 'pointer' : 'not-allowed',
                    }}
                    className="flex-1"
                  >
                    Discharge
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Fullscreen Image Viewer */}
      {fullscreenImg && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
          onClick={() => setFullscreenImg(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white z-10"
            onClick={() => setFullscreenImg(null)}
          >
            <X size={22} />
          </button>
          <img
            src={fullscreenImg}
            alt=""
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default CaseDetailScreen;
