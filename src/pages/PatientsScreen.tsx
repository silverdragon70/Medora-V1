import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Plus, ChevronDown } from 'lucide-react';
import { patientService } from '@/services/patientService';
import { caseService } from '@/services/caseService';
import type { Patient } from '@/services/db/database';

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const calculateAge = (dob: string): number => {
  const birth = new Date(dob);
  const now = new Date();
  return (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
};

const formatAge = (dob: string) => {
  const years = calculateAge(dob);
  if (years < 1) return `${Math.round(years * 12)}m`;
  return `${Math.floor(years)}y`;
};

type FilterCategory = 'dateAdded' | 'ageGroup' | 'specialty';
const filterOptions = [
  { category: 'dateAdded' as FilterCategory, label: 'Date Added', values: [
    { key: 'week', label: 'Last week' }, { key: 'month', label: 'Last month' },
    { key: '3months', label: 'Last 3 months' }, { key: 'year', label: 'Last year' },
  ]},
  { category: 'ageGroup' as FilterCategory, label: 'Age Group', values: [
    { key: 'neonate', label: 'Neonate (0–1m)' }, { key: 'infant', label: 'Infant (1–12m)' },
    { key: 'toddler', label: 'Toddler (1–3y)' }, { key: 'child', label: 'Child (3–12y)' },
    { key: 'adolescent', label: 'Adolescent (12–18y)' },
  ]},
  { category: 'specialty' as FilterCategory, label: 'Specialty', values: [
    { key: 'cardiology', label: 'Cardiology' },
    { key: 'pulmonology', label: 'Pulmonology' },
    { key: 'gastroenterology', label: 'Gastroenterology' },
    { key: 'nephrology', label: 'Nephrology' },
    { key: 'neurology', label: 'Neurology' },
    { key: 'hematology', label: 'Hematology' },
    { key: 'endocrinology', label: 'Endocrinology' },
    { key: 'infectious-disease', label: 'Infectious Disease' },
    { key: 'neonatology', label: 'Neonatology' },
    { key: 'general-pediatrics', label: 'General Pediatrics' },
  ]},
];

const matchesAgeGroup = (dob: string, key: string) => {
  const months = calculateAge(dob) * 12;
  switch (key) {
    case 'neonate': return months <= 1;
    case 'infant': return months > 1 && months <= 12;
    case 'toddler': return months > 12 && months <= 36;
    case 'child': return months > 36 && months <= 144;
    case 'adolescent': return months > 144 && months <= 216;
    default: return true;
  }
};

const FilterChip = ({ label, options, selected, onSelect, align = 'left' }: {
  label: string; options: { key: string; label: string }[];
  selected: string | null; onSelect: (k: string) => void; align?: 'left' | 'right';
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const selectedLabel = options.find(o => o.key === selected)?.label;
  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => setOpen(p => !p)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'}`}>
        {selectedLabel || label}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute top-full mt-1.5 w-[200px] bg-card border border-border rounded-xl overflow-hidden ${align === 'right' ? 'right-0' : 'left-0'}`} style={{ zIndex: 9999, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
          {options.map(o => (
            <button key={o.key} onClick={() => { onSelect(o.key); setOpen(false); }} className={`w-full px-4 py-2.5 text-left text-[12px] transition-colors ${selected === o.key ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted/50'}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface PatientWithMeta extends Patient { caseCount: number; lastVisit: string; hasActiveCase: boolean; specialties: string[]; }

const PAGE_SIZE = 20;

const PatientsScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string | null>>({});
  const [allPatients, setAllPatients] = useState<PatientWithMeta[]>([]);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const enrichPatient = async (p: Patient): Promise<PatientWithMeta> => {
    const cases = await caseService.getByPatient(p.id);
    const sorted = [...cases].sort((a, b) => new Date(b.admission_date).getTime() - new Date(a.admission_date).getTime());
    const specialties = [...new Set(cases.map(c => c.specialty).filter(Boolean))] as string[];
    return {
      ...p,
      caseCount: cases.length,
      lastVisit: sorted[0]?.admission_date ?? p.created_at,
      hasActiveCase: cases.some(c => c.status === 'active'),
      specialties,
    };
  };

  // Load ALL patients, enrich, sort by lastVisit
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const all = await patientService.getAll();
        const enriched = await Promise.all(all.map(enrichPatient));
        enriched.sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());
        setAllPatients(enriched);
        setDisplayCount(PAGE_SIZE);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const patients = allPatients.slice(0, displayCount);
  const hasMore = displayCount < allPatients.length;
  const loadingMore = false;

  // Intersection Observer for virtual scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore) setDisplayCount(c => c + PAGE_SIZE); },
      { threshold: 0.1 }
    );
    const el = loaderRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore]);

  const toggleFilter = (cat: string, key: string) =>
    setActiveFilters(prev => ({ ...prev, [cat]: prev[cat] === key ? null : key }));

  const filtered = useMemo(() => {
    return patients.filter(p => {
      if (searchQuery && !p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(p.file_number?.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
      if (activeFilters.dateAdded) {
        const diffDays = (Date.now() - new Date(p.created_at).getTime()) / 86400000;
        const limits: Record<string, number> = { week: 7, month: 30, '3months': 90, year: 365 };
        if (diffDays > (limits[activeFilters.dateAdded] ?? Infinity)) return false;
      }
      if (activeFilters.ageGroup && !matchesAgeGroup(p.dob, activeFilters.ageGroup)) return false;
      if (activeFilters.specialty && !p.specialties.some(s =>
        s.toLowerCase().replace(/ /g, '-') === activeFilters.specialty
      )) return false;
      return true;
    });
  }, [patients, searchQuery, activeFilters]);

  return (
    <div className="px-5 py-6 space-y-5 animate-fade-in">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input type="text" placeholder="Search patients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full h-12 pl-12 pr-4 bg-card border border-border rounded-2xl text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all shadow-card" />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-2 pb-1 flex-1" style={{ scrollbarWidth: 'none' }}>
          {filterOptions.map((g, i) => (
            <FilterChip key={g.category} label={g.label} options={g.values} selected={activeFilters[g.category] || null}
              onSelect={k => toggleFilter(g.category, k)} align={i === filterOptions.length - 1 ? 'right' : 'left'} />
          ))}
        </div>
        {Object.values(activeFilters).some(Boolean) && (
          <button onClick={() => setActiveFilters({})} className="shrink-0 text-[11px] text-primary font-semibold">Clear All</button>
        )}
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-foreground">{filtered.length} Patient{filtered.length !== 1 ? 's' : ''}</h3>
        <button onClick={() => navigate('/case/new')} className="flex items-center gap-1 text-[12px] text-primary font-semibold">
          <Plus size={14} /> Add New
        </button>
      </div>
      <div className="space-y-3">
        {loading && <div className="py-10 text-center text-[13px] text-muted-foreground">Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div className="py-10 text-center text-[13px] text-muted-foreground">
            {patients.length === 0 ? 'No patients yet. Add a case to get started.' : 'No patients match the filters.'}
          </div>
        )}
        {filtered.map(p => (
          <div key={p.id} onClick={() => navigate(`/patient/${p.id}`)}
            className="group p-3 bg-card border border-border rounded-xl active:scale-[0.98] transition-all cursor-pointer hover:shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-avatar flex items-center justify-center text-primary-foreground font-bold text-[14px] shadow-sm">{getInitials(p.full_name)}</div>
                <div>
                  <h4 className="text-[14px] font-bold text-foreground">{p.full_name}</h4>
                  <p className="text-[11px] text-muted-foreground">
                    {formatAge(p.dob)} • {p.gender} • {p.caseCount} case{p.caseCount !== 1 ? 's' : ''}
                    {p.file_number ? ` • ${p.file_number}` : ''}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex justify-end mt-1">
              <span className="text-[11px] font-bold" style={{ borderRadius: 20, padding: '3px 10px',
                backgroundColor: p.hasActiveCase ? '#DCFCE7' : '#F1F5F9',
                color: p.hasActiveCase ? '#16A34A' : '#64748B' }}>
                {p.hasActiveCase ? 'Active' : 'Discharged'}
              </span>
            </div>
          </div>
        ))}

        {/* Infinite scroll trigger */}
        {!searchQuery.trim() && (
          <div ref={loaderRef} className="py-2 text-center">
            {loadingMore && (
              <p className="text-[12px] text-muted-foreground">Loading more...</p>
            )}
            {!hasMore && patients.length > 0 && (
              <p className="text-[11px] text-muted-foreground">All {patients.length} patients loaded</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientsScreen;
