import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, ChevronRight, ChevronDown, Pencil, Trash2, Hospital, Building2, MapPin, Briefcase, CalendarDays, Stethoscope, X, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { hospitalService } from '@/services/hospitalService';
import { caseService } from '@/services/caseService';
import { patientService } from '@/services/patientService';
import type { Hospital as HospitalType, Patient, Case } from '@/services/db/database';
import { toast } from 'sonner';

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
const calcAge = (dob: string) => {
  const y = (Date.now() - new Date(dob).getTime()) / (1000*60*60*24*365.25);
  return y < 1 ? `${Math.round(y*12)}m` : `${Math.floor(y)}y`;
};

interface PatientRow extends Patient { caseCount: number; hasActive: boolean; }

const HospitalPatientsScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [hospital, setHospital] = useState<HospitalType | null>(null);
  const [allPatients, setAllPatients] = useState<PatientRow[]>([]);
  const [displayCount, setDisplayCount] = useState(20);
  const [stats, setStats] = useState({ total: 0, active: 0, discharged: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'discharged'>('all');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Edit form state
  const [eName, setEName] = useState('');
  const [eDept, setEDept] = useState('');
  const [eLoc, setELoc] = useState('');
  const [ePos, setEPos] = useState('');
  const [eDate, setEDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const h = await hospitalService.getById(id);
      if (!h) return;
      setHospital(h);
      setEName(h.name); setEDept(h.department);
      setELoc(h.location ?? ''); setEPos(h.position ?? '');
      setEDate(h.start_date ? new Date(h.start_date) : undefined);

      const allCases = await caseService.getAll({ hospital_id: id });
      const patientIds = [...new Set(allCases.map(c => c.patient_id))];
      const rows: PatientRow[] = [];
      for (const pid of patientIds) {
        const p = await patientService.getById(pid);
        if (!p) continue;
        const pCases = allCases.filter(c => c.patient_id === pid);
        rows.push({ ...p, caseCount: pCases.length, hasActive: pCases.some(c => c.status === 'active') });
      }
      setAllPatients(rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())); setDisplayCount(20);
      setStats({ total: patientIds.length, active: rows.filter(r => r.hasActive).length, discharged: rows.filter(r => !r.hasActive).length });
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let base = allPatients;
    if (statusFilter === 'active') base = base.filter(p => p.hasActive);
    else if (statusFilter === 'discharged') base = base.filter(p => !p.hasActive);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(p => p.full_name.toLowerCase().includes(q) || p.file_number?.toLowerCase().includes(q));
    }
    return searchQuery.trim() ? base : base.slice(0, displayCount);
  }, [allPatients, searchQuery, displayCount, statusFilter]);

  const hasMore = !searchQuery.trim() && displayCount < (
    statusFilter === 'active' ? allPatients.filter(p => p.hasActive).length :
    statusFilter === 'discharged' ? allPatients.filter(p => !p.hasActive).length :
    allPatients.length
  );

  useEffect(() => { setDisplayCount(20); }, [statusFilter]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore) setDisplayCount(c => c + 20); },
      { threshold: 0.1 }
    );
    const el = loaderRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore]);

  const handleSaveEdit = async () => {
    if (!id || !eName.trim() || !eDept.trim()) return;
    setSaving(true);
    try {
      await hospitalService.update(id, { name: eName.trim(), department: eDept.trim(), location: eLoc || undefined, position: (ePos as any) || undefined, start_date: eDate ? eDate.toISOString().split('T')[0] : undefined });
      toast.success('Hospital updated');
      setEditOpen(false);
      load();
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await hospitalService.delete(id);
      toast.success('Hospital deleted');
      navigate(-1);
    } catch (e: any) { toast.error(e.message ?? 'Failed to delete'); setDeleteOpen(false); }
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <header className="sticky top-0 z-40 px-4 pb-3 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground"><ArrowLeft size={20} /></button>
          <h1 className="text-[16px] font-bold text-foreground">{hospital?.name ?? 'Hospital'}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditOpen(true)} className="p-2 rounded-full hover:bg-muted text-muted-foreground"><Pencil size={16} /></button>
          <button onClick={() => setDeleteOpen(true)} className="p-2 rounded-full hover:bg-muted text-destructive"><Trash2 size={16} /></button>
        </div>
      </header>

      <div className="px-5 py-5 space-y-5">
        {hospital && (
          <div className="relative overflow-hidden bg-card rounded-[18px] border border-border">
            <div className="h-1 w-full gradient-brand" />
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-accent rounded-xl flex items-center justify-center text-primary"><Hospital size={22} /></div>
                <div>
                  <h2 className="text-[18px] font-bold text-foreground">{hospital.name}</h2>
                  <p className="text-[13px] text-muted-foreground">{hospital.department}{hospital.location ? ` • ${hospital.location}` : ''}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: stats.total,     label: 'PATIENTS',   filter: 'all'        as const, color: '#2563EB' },
                  { value: hospital.start_date ? format(new Date(hospital.start_date), 'MMM d, yyyy') : '—', label: 'SINCE', filter: null, color: '#2563EB' },
                  { value: stats.active,    label: 'ACTIVE',     filter: 'active'     as const, color: '#16A34A' },
                  { value: stats.discharged,label: 'DISCHARGED', filter: 'discharged' as const, color: '#64748B' },
                ].map(s => (
                  s.filter !== null ? (
                    <button key={s.label}
                      onClick={() => setStatusFilter(prev => prev === s.filter ? 'all' : s.filter!)}
                      className="rounded-[10px] px-3 py-2 flex flex-col items-center transition-all active:scale-95"
                      style={{
                        backgroundColor: statusFilter === s.filter ? s.color + '18' : '#F8FAFC',
                        border: `1.5px solid ${statusFilter === s.filter ? s.color : 'transparent'}`,
                      }}>
                      <span className="text-[16px] font-bold" style={{ color: statusFilter === s.filter ? s.color : '#2563EB' }}>{s.value}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: statusFilter === s.filter ? s.color : '#94A3B8' }}>{s.label}</span>
                    </button>
                  ) : (
                    <div key={s.label} className="rounded-[10px] px-3 py-2 flex flex-col items-center" style={{ backgroundColor: '#F8FAFC' }}>
                      <span className="text-[16px] font-bold text-primary">{s.value}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 text-muted-foreground">{s.label}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input type="text" placeholder="Search patients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-card border border-border rounded-2xl text-[14px] focus:outline-none focus:border-primary transition-all" />
        </div>

        <h3 className="text-[14px] font-bold text-foreground">{filtered.length} Patient{filtered.length !== 1 ? 's' : ''}</h3>

        <div className="space-y-3">
          {loading && <div className="py-10 text-center text-[13px] text-muted-foreground">Loading...</div>}
          {!loading && filtered.length === 0 && <div className="py-10 text-center text-[13px] text-muted-foreground">No patients in this hospital yet.</div>}
          {filtered.map(p => (
            <div key={p.id} onClick={() => navigate(`/patient/${p.id}`)}
              className="group flex items-center justify-between p-3 bg-card border border-border rounded-xl active:scale-[0.98] transition-all cursor-pointer hover:shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-avatar flex items-center justify-center text-primary-foreground font-bold text-[14px]">{getInitials(p.full_name)}</div>
                <div>
                  <h4 className="text-[14px] font-bold text-foreground">{p.full_name}</h4>
                  <p className="text-[11px] text-muted-foreground">{calcAge(p.dob)} • {p.gender} • {p.caseCount} case{p.caseCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${p.hasActive ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                  {p.hasActive ? 'active' : 'discharged'}
                </span>
                <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))}

          {/* Infinite scroll trigger */}
          <div ref={loaderRef} className="py-2 text-center">
            {hasMore && <p className="text-[12px] text-muted-foreground">Loading more...</p>}
            {!hasMore && allPatients.length > 20 && (
              <p className="text-[11px] text-muted-foreground">All {allPatients.length} patients loaded</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Sheet */}
      {editOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto bg-background rounded-t-[24px]">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
            <div className="px-5 pb-2 flex items-center justify-between">
              <h2 className="text-[18px] font-bold">Edit Hospital</h2>
              <button onClick={() => setEditOpen(false)} className="p-2 rounded-full hover:bg-muted"><X size={18} /></button>
            </div>
            <div className="px-5 space-y-4" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
              {[{ label: 'Hospital Name *', val: eName, set: setEName, ph: 'Hospital name' },
                { label: 'Department *', val: eDept, set: setEDept, ph: 'Department' },
                { label: 'Location', val: eLoc, set: setELoc, ph: 'City, Country' }].map(f => (
                <div key={f.label} className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-foreground">{f.label}</label>
                  <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                    className="w-full h-12 px-4 bg-card border border-border rounded-xl text-[14px] focus:outline-none focus:border-primary" />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-foreground">Position</label>
                <Select value={ePos} onValueChange={setEPos}>
                  <SelectTrigger className="w-full h-12"><SelectValue placeholder="Select position" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intern">Intern</SelectItem>
                    <SelectItem value="resident">Resident</SelectItem>
                    <SelectItem value="registrar">Registrar</SelectItem>
                    <SelectItem value="specialist">Specialist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Start Working Date */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                  <CalendarDays size={14} className="text-primary" /> Start Working Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full h-12 px-4 bg-card border border-border rounded-xl text-[14px] text-left flex items-center justify-between focus:outline-none focus:border-primary">
                      <span className={eDate ? 'text-foreground' : 'text-muted-foreground'}>
                        {eDate ? format(eDate, 'PPP') : 'Pick a date'}
                      </span>
                      <CalendarDays size={16} className="text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={eDate} onSelect={setEDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <button onClick={handleSaveEdit} disabled={!eName.trim() || !eDept.trim() || saving}
                className={cn('w-full h-[52px] rounded-[12px] font-semibold text-[15px] text-white transition-all',
                  eName.trim() && eDept.trim() ? 'bg-primary' : 'bg-muted text-muted-foreground cursor-not-allowed')}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hospital</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This will permanently delete the hospital and ALL its cases, investigations, and data. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HospitalPatientsScreen;
