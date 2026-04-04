import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Hospital, Stethoscope } from 'lucide-react';
import { BarChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, LabelList } from 'recharts';
import { patientService } from '@/services/patientService';
import { caseService } from '@/services/caseService';
import { hospitalService } from '@/services/hospitalService';
import { procedureService } from '@/services/procedureService';
import type { Case, Patient, Hospital as HospitalType } from '@/services/db/database';

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const formatTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};
const GenderIcon = ({ gender }: { gender: 'male' | 'female' }) => (
  <span className={`font-bold ${gender === 'male' ? 'text-blue-500' : 'text-rose-400'}`} style={{ fontSize: 12, lineHeight: 1 }}>
    {gender === 'male' ? '♂' : '♀'}
  </span>
);

const StatsTab = () => {
  const [admissionsData, setAdmissionsData] = useState<{ month: string; admissions: number }[]>([]);
  const [diagnosesData, setDiagnosesData] = useState<{ name: string; count: number }[]>([]);
  const [procStats, setProcStats] = useState({ total: 0, performed: 0, assisted: 0, observed: 0 });
  const [timeFilter, setTimeFilter] = useState('All');

  useEffect(() => {
    const load = async () => {
      const allCases = await caseService.getAll();
      const monthMap: Record<string, number> = {};
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthMap[d.toLocaleString('default', { month: 'short' })] = 0;
      }
      allCases.forEach(c => {
        const month = new Date(c.admission_date).toLocaleString('default', { month: 'short' });
        if (month in monthMap) monthMap[month]++;
      });
      setAdmissionsData(Object.entries(monthMap).map(([month, admissions]) => ({ month, admissions })));
      const diagMap: Record<string, number> = {};
      allCases.forEach(c => { const d = c.provisional_diagnosis ?? c.final_diagnosis; if (d) diagMap[d] = (diagMap[d] ?? 0) + 1; });
      setDiagnosesData(Object.entries(diagMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })));
      setProcStats(await procedureService.getStats());
    };
    load();
  }, []);

  return (
    <div className="space-y-8 py-4 animate-fade-in">
      <div className="flex gap-6 overflow-x-auto no-scrollbar">
        {['All', 'This Month', '3M', '6M', 'Year'].map(f => (
          <button key={f} onClick={() => setTimeFilter(f)} className={`pb-2 text-[13px] font-semibold whitespace-nowrap transition-all border-b-2 ${timeFilter === f ? 'text-primary border-primary' : 'text-[hsl(215,17%,62%)] border-transparent'}`}>{f}</button>
        ))}
      </div>
      <div>
        <h3 className="text-[16px] font-bold text-foreground mb-4">Admissions per Month</h3>
        <div style={{ minWidth: 500, height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={admissionsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(215,17%,62%)' }} axisLine={{ stroke: 'hsl(210,14%,93%)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(215,17%,62%)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(210,14%,89%)', fontSize: 12, boxShadow: 'none' }} />
              <Bar dataKey="admissions" fill="hsl(221,83%,53%)" fillOpacity={0.6} radius={[4, 4, 0, 0]} barSize={20} />
              <Line type="monotone" dataKey="admissions" stroke="hsl(168,62%,30%)" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="h-px" style={{ backgroundColor: 'hsl(210,24%,95%)' }} />
      {diagnosesData.length > 0 && (
        <div>
          <h3 className="text-[16px] font-bold text-foreground mb-4">Top Diagnoses</h3>
          <div style={{ minWidth: 350, height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diagnosesData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215,17%,62%)' }} axisLine={{ stroke: 'hsl(210,14%,93%)' }} tickLine={false} interval={0} tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 9) + '…' : v} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(215,17%,62%)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(210,14%,89%)', fontSize: 12, boxShadow: 'none' }} />
                <Bar dataKey="count" fill="hsl(221,83%,53%)" radius={[4, 4, 0, 0]} barSize={24}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 12, fontWeight: 700, fill: 'hsl(213,32%,15%)' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <div className="h-px" style={{ backgroundColor: 'hsl(210,24%,95%)' }} />
      <div>
        <h3 className="text-[16px] font-bold text-foreground mb-4">Procedures</h3>
        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
          {[{ value: procStats.total, label: 'TOTAL' }, { value: procStats.performed, label: 'PERFORMED' }, { value: procStats.assisted, label: 'ASSISTED' }, { value: procStats.observed, label: 'OBSERVED' }].map(item => (
            <div key={item.label} className="flex flex-col items-center justify-center py-2">
              <span className="text-[32px] font-bold text-primary">{item.value}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider mt-1 text-[hsl(215,17%,62%)]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CasesScreen = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [insightState, setInsightState] = useState<'ready' | 'loading' | 'done'>('ready');
  const [cases, setCases] = useState<Case[]>([]);
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [hospital, setHospital] = useState<HospitalType | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, discharged: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const fetchedCases = await caseService.getAll();
        setAllCases(fetchedCases);
        setCases(fetchedCases.slice(0, 10));
        const pm: Record<string, Patient> = {};
        for (const c of fetchedCases) {
          if (!pm[c.patient_id]) { const p = await patientService.getById(c.patient_id); if (p) pm[c.patient_id] = p; }
        }
        setPatients(pm);
        const hospitals = await hospitalService.getAll();
        if (hospitals.length > 0) {
          const h = hospitals[0];
          setHospital(h);
          // Stats for THIS hospital only
          const hospitalCases = fetchedCases.filter(c => c.hospital_id === h.id);
          setStats({
            total: hospitalCases.length,
            active: hospitalCases.filter(c => c.status === 'active').length,
            discharged: hospitalCases.filter(c => c.status === 'discharged').length,
          });
        }
      } finally { setLoading(false); }
    };
    load();
  }, []);

  // Search across ALL cases with all fields
  const filtered = (searchQuery.trim() ? allCases : cases).filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const p = patients[c.patient_id];
    return (
      p?.full_name.toLowerCase().includes(q) ||
      p?.file_number?.toLowerCase().includes(q) ||
      c.provisional_diagnosis?.toLowerCase().includes(q) ||
      c.final_diagnosis?.toLowerCase().includes(q) ||
      c.chief_complaint?.toLowerCase().includes(q) ||
      c.present_history?.toLowerCase().includes(q) ||
      c.current_medications?.toLowerCase().includes(q) ||
      c.specialty?.toLowerCase().includes(q) ||
      false
    );
  });

  return (
    <div className="px-5 py-6 space-y-6 animate-fade-in">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input type="text" placeholder="Search patient or diagnosis..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full h-12 pl-12 pr-4 bg-card border border-border rounded-2xl text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all shadow-card" />
      </div>
      <div className="flex justify-end -mb-4">
        <button onClick={() => navigate('/hospital/new')} className="text-[13px] text-primary font-semibold active:opacity-70">+ Add New Hospital</button>
      </div>
      {hospital ? (
        <section onClick={() => navigate(`/hospital/${hospital.id}`)} className="relative overflow-hidden bg-card border border-border rounded-2xl shadow-card cursor-pointer active:scale-[0.98] transition-all">
          <div className="h-1 w-full gradient-brand" />
          <div className="p-4 flex items-center gap-4">
            <div className="w-[44px] h-[44px] bg-accent rounded-xl flex items-center justify-center text-primary"><Hospital size={24} /></div>
            <div>
              <h3 className="text-[14px] font-bold text-foreground">{hospital.name}</h3>
              <p className="text-[11px] text-muted-foreground">{hospital.department}{hospital.location ? ` • ${hospital.location}` : ''}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-border">
            {[{ label: 'TOTAL', value: stats.total, cls: 'text-primary' }, { label: 'ACTIVE', value: stats.active, cls: 'text-secondary' }, { label: 'DISCH', value: stats.discharged, cls: 'text-amber-500' }].map((s, i) => (
              <div key={s.label} className={`p-3 flex flex-col items-center ${i !== 2 ? 'border-r border-border' : ''}`}>
                <span className={`text-[18px] font-mono font-bold ${s.cls}`}>{s.value}</span>
                <span className="text-[9px] font-bold text-muted-foreground tracking-wider mt-1">{s.label}</span>
              </div>
            ))}
          </div>
        </section>
      ) : !loading && (
        <div className="p-4 bg-card border border-dashed border-border rounded-2xl text-center">
          <p className="text-[13px] text-muted-foreground">No hospital added yet.</p>
          <button onClick={() => navigate('/hospital/new')} className="mt-2 text-[13px] text-primary font-semibold">+ Add Hospital</button>
        </div>
      )}
      <div className="p-1 bg-muted rounded-xl flex gap-1">
        {['list', 'stats', 'insights'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 ${activeTab === tab ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab === 'list' ? 'Patient List' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {activeTab === 'list' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14px] font-bold text-foreground">
                {searchQuery.trim() ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${searchQuery}"` : 'Recent Cases'}
              </h3>
              {!searchQuery.trim() && (
                <button onClick={() => navigate('/AllPatientList')} className="text-[12px] text-primary font-medium">View All</button>
              )}
            </div>
            {loading && <div className="py-10 text-center text-[13px] text-muted-foreground">Loading...</div>}
            {!loading && filtered.length === 0 && (
              <div className="py-10 text-center space-y-2">
                <p className="text-[14px] text-muted-foreground">
                  {searchQuery.trim() ? `No results for "${searchQuery}"` : 'No cases yet.'}
                </p>
                {!searchQuery.trim() && (
                  <button onClick={() => navigate('/case/new')} className="text-[13px] text-primary font-semibold">+ Add First Case</button>
                )}
              </div>
            )}
            {filtered.map(c => {
              const patient = patients[c.patient_id];
              return (
                <div key={c.id} onClick={() => navigate(`/case/${c.id}`)} className="group flex items-center justify-between p-3 bg-card border border-border rounded-xl active:scale-[0.98] transition-all cursor-pointer hover:shadow-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-avatar flex items-center justify-center text-primary-foreground font-bold text-[14px] shadow-sm">{patient ? getInitials(patient.full_name) : '?'}</div>
                    <div>
                      <h4 className="text-[14px] font-bold text-foreground">{patient?.full_name ?? 'Unknown'}</h4>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        {patient && <GenderIcon gender={patient.gender} />}
                        {c.specialty} • {formatTimeAgo(c.updated_at)}
                      </p>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight uppercase ${c.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {c.status}
                  </div>
                </div>
              );
            })}
          </>
        )}
        {activeTab === 'stats' && <StatsTab />}
        {activeTab === 'insights' && (
          <div className="space-y-3 py-4 animate-fade-in">
            {insightState === 'ready' && (
              <div className="p-10 flex flex-col items-center text-center">
                <button onClick={() => setInsightState('loading')} className="w-16 h-16 bg-[#2563EB]/10 rounded-full flex items-center justify-center mb-4 active:scale-90 transition-transform">
                  <Stethoscope size={32} className="text-[#2563EB] animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                </button>
                <h5 className="text-[16px] font-bold" style={{ color: '#1A2332' }}>Start Analysis</h5>
                <p className="text-[13px] mt-1 max-w-[220px]" style={{ color: '#6B7C93' }}>Tap to generate today's clinical summaries</p>
              </div>
            )}
            {insightState === 'loading' && (
              <div className="p-10 flex flex-col items-center text-center opacity-60">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Stethoscope size={32} className="text-muted-foreground animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <h5 className="text-[16px] font-bold" style={{ color: '#6B7C93' }}>AI Analysis in Progress</h5>
                <div className="mt-4 flex gap-1">
                  {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: `${i*0.3}s` }} />)}
                </div>
              </div>
            )}
            {insightState === 'done' && (
              <div className="p-6 text-center">
                <p className="text-[13px] text-muted-foreground">AI Insights require an API key.</p>
                <button onClick={() => navigate('/settings')} className="mt-2 text-[13px] text-primary font-semibold">Go to Settings →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CasesScreen;
