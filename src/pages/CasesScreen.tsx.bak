import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Hospital, Stethoscope } from 'lucide-react';
import { BarChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, LabelList } from 'recharts';

const mockCases = [
  { caseId: '1', patientName: 'Lucas Miller', initials: 'LM', gender: 'male' as const, department: 'Respiratory', tagColor: 'bg-accent text-accent-foreground', complaint: 'Persistent cough', diagnosis: 'Bronchitis', room: 'Room 402', lastModified: Date.now() - 4 * 60 * 60 * 1000, mediaCount: 2 },
  { caseId: '2', patientName: 'Sophia Chen', initials: 'SC', gender: 'female' as const, department: 'Cardiology', tagColor: 'bg-destructive/10 text-destructive', complaint: 'Chest pain', diagnosis: 'Arrhythmia', room: 'Room 215', lastModified: Date.now() - 12 * 60 * 60 * 1000, mediaCount: 5 },
  { caseId: '3', patientName: 'Ethan Wright', initials: 'EW', gender: 'male' as const, department: 'General', tagColor: 'bg-secondary/20 text-secondary', complaint: 'Fever & fatigue', diagnosis: 'Viral infection', room: 'Room 108', lastModified: Date.now() - 24 * 60 * 60 * 1000, mediaCount: 0 },
  { caseId: '4', patientName: 'Maya Johnson', initials: 'MJ', gender: 'female' as const, department: 'Neurology', tagColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', complaint: 'Headache', diagnosis: 'Migraine', room: 'Room 303', lastModified: Date.now() - 2 * 24 * 60 * 60 * 1000, mediaCount: 1 },
];

const formatTimeAgo = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const GenderIcon = ({ gender, size = 13 }: { gender: 'male' | 'female'; size?: number }) => (
  <span
    className={`font-bold ${gender === 'male' ? 'text-blue-500' : 'text-rose-400'}`}
    style={{ fontSize: size, lineHeight: 1 }}
  >
    {gender === 'male' ? '♂' : '♀'}
  </span>
);

const stats = [
  { label: 'TOTAL', value: '142', className: 'text-primary' },
  { label: 'ACTIVE', value: '38', className: 'text-secondary' },
  { label: 'DISCH', value: '12', className: 'text-amber-500' },
];

type InsightState = 'ready' | 'loading' | 'done';

const mockInsightResults = [
  {
    status: 'red' as const,
    label: 'Needs Attention',
    cases: [
      { name: 'Lucas Miller', summary: 'Persistent cough worsening despite nebulization. SpO2 dropped to 94%. Consider escalating to IV antibiotics and chest CT.', recommendation: 'Urgent review by attending physician' },
      { name: 'Sophia Chen', summary: 'New-onset arrhythmia with intermittent chest pain. ECG shows prolonged QT interval. Cardiology consult pending.', recommendation: 'Continuous cardiac monitoring required' },
    ],
  },
  {
    status: 'yellow' as const,
    label: 'Review Plan',
    cases: [
      { name: 'Ethan Wright', summary: 'Fever trending down but fatigue persists. CBC shows improving WBC count. Current antivirals completing day 3.', recommendation: 'Reassess discharge readiness in 24h' },
    ],
  },
  {
    status: 'green' as const,
    label: 'Ready for Discharge',
    cases: [
      { name: 'Maya Johnson', summary: 'Migraine resolved with treatment protocol. No recurrence in 48h. Tolerating oral medications well.', recommendation: 'Discharge with outpatient follow-up in 1 week' },
    ],
  },
];

const statusColors = {
  red: { dot: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-900/50', text: 'text-red-700 dark:text-red-400' },
  yellow: { dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900/50', text: 'text-amber-700 dark:text-amber-400' },
  green: { dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900/50', text: 'text-emerald-700 dark:text-emerald-400' },
};

// Mock data for stats
const mockAdmissionsData = [
  { month: 'Apr', admissions: 18, trend: 16 },
  { month: 'May', admissions: 24, trend: 20 },
  { month: 'Jun', admissions: 15, trend: 18 },
  { month: 'Jul', admissions: 28, trend: 22 },
  { month: 'Aug', admissions: 22, trend: 24 },
  { month: 'Sep', admissions: 30, trend: 26 },
  { month: 'Oct', admissions: 19, trend: 23 },
  { month: 'Nov', admissions: 35, trend: 28 },
  { month: 'Dec', admissions: 26, trend: 29 },
  { month: 'Jan', admissions: 31, trend: 30 },
  { month: 'Feb', admissions: 20, trend: 27 },
  { month: 'Mar', admissions: 27, trend: 28 },
];

const mockDiagnosesData = [
  { name: 'Bronchiolitis', count: 34 },
  { name: 'Pneumonia', count: 28 },
  { name: 'Sepsis', count: 19 },
  { name: 'Gastroenteritis', count: 15 },
  { name: 'Asthma', count: 12 },
];

const mockProcedureStats = { total: 142, performed: 89, assisted: 38, observed: 15 };

type TimeFilter = 'All' | 'This Month' | '3M' | '6M' | 'Year';

const StatsTab = () => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('All');
  const filters: TimeFilter[] = ['All', 'This Month', '3M', '6M', 'Year'];

  return (
    <div className="space-y-8 py-4 animate-fade-in">
      {/* Time Filter - text-only style */}
      <div className="flex gap-6 overflow-x-auto no-scrollbar">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setTimeFilter(f)}
            className={`pb-2 text-[13px] font-semibold whitespace-nowrap transition-all border-b-2 ${
              timeFilter === f
                ? 'text-primary border-primary'
                : 'text-[hsl(215,17%,62%)] border-transparent'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Section 1: Admissions per Month */}
      <div>
        <h3 className="text-[16px] font-bold text-foreground mb-4">Admissions per Month</h3>
        <div className="overflow-x-auto no-scrollbar -mx-2">
          <div style={{ minWidth: 500, height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={mockAdmissionsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(215,17%,62%)' }} axisLine={{ stroke: 'hsl(210,14%,93%)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(215,17%,62%)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(210,14%,89%)', fontSize: 12, boxShadow: 'none' }} />
                <Bar dataKey="admissions" fill="hsl(221,83%,53%)" fillOpacity={0.6} radius={[4, 4, 0, 0]} barSize={20} />
                <Line type="monotone" dataKey="trend" stroke="hsl(168,62%,30%)" strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px" style={{ backgroundColor: 'hsl(210,24%,95%)' }} />

      {/* Section 2: Top Diagnoses */}
      <div>
        <h3 className="text-[16px] font-bold text-foreground mb-4">Top Diagnoses</h3>
        <div className="overflow-x-auto no-scrollbar -mx-2">
          <div style={{ minWidth: 350, height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockDiagnosesData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'hsl(215,17%,62%)' }}
                  axisLine={{ stroke: 'hsl(210,14%,93%)' }}
                  tickLine={false}
                  interval={0}
                  tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 9) + '…' : v}
                />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(215,17%,62%)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(210,14%,89%)', fontSize: 12, boxShadow: 'none' }} />
                <Bar dataKey="count" fill="hsl(221,83%,53%)" radius={[4, 4, 0, 0]} barSize={24}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 12, fontWeight: 700, fill: 'hsl(213,32%,15%)' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px" style={{ backgroundColor: 'hsl(210,24%,95%)' }} />

      {/* Section 3: Procedures Stats */}
      <div>
        <h3 className="text-[16px] font-bold text-foreground mb-4">Procedures</h3>
        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
          {[
            { value: mockProcedureStats.total, label: 'TOTAL' },
            { value: mockProcedureStats.performed, label: 'PERFORMED' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center justify-center py-2">
              <span className="text-[32px] font-bold text-primary">{item.value}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider mt-1 text-[hsl(215,17%,62%)]">{item.label}</span>
            </div>
          ))}
        </div>
        <div className="h-px my-2" style={{ backgroundColor: 'hsl(210,24%,95%)' }} />
        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
          {[
            { value: mockProcedureStats.assisted, label: 'ASSISTED' },
            { value: mockProcedureStats.observed, label: 'OBSERVED' },
          ].map((item) => (
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
  const [insightState, setInsightState] = useState<InsightState>('ready');
  const navigate = useNavigate();

  const handleStartAnalysis = () => {
    setInsightState('loading');
    setTimeout(() => setInsightState('done'), 3500);
  };

  return (
    <div className="px-5 py-6 space-y-6 animate-fade-in">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          type="text"
          placeholder="Search patient or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-12 pl-12 pr-4 bg-card border border-border rounded-2xl text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all shadow-card"
        />
      </div>

      {/* Add Hospital */}
      <div className="flex justify-end -mb-4">
        <button
          onClick={() => navigate('/hospital/new')}
          className="text-[13px] text-primary font-semibold active:opacity-70 transition-opacity"
        >
          + Add New Hospital
        </button>
      </div>

      {/* Hospital Overview Card */}
      <section onClick={() => navigate('/hospital/1')} className="relative overflow-hidden bg-card border border-border rounded-2xl shadow-card cursor-pointer active:scale-[0.98] transition-all">
        <div className="h-1 w-full gradient-brand" />
        <div className="p-4 flex items-center gap-4">
          <div className="w-[44px] h-[44px] bg-accent rounded-xl flex items-center justify-center text-primary">
            <Hospital size={24} />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-foreground">St. Jude Children's</h3>
            <p className="text-[11px] text-muted-foreground">Main Wing • Central Unit</p>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-border">
          {stats.map((stat, idx) => (
            <div
              key={stat.label}
              className={`p-3 flex flex-col items-center justify-center ${idx !== stats.length - 1 ? 'border-r border-border' : ''}`}
            >
              <span className={`text-[18px] font-mono font-bold ${stat.className}`}>{stat.value}</span>
              <span className="text-[9px] font-bold text-muted-foreground tracking-wider mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Segmented Tabs */}
      <div className="p-1 bg-muted rounded-xl flex gap-1">
        {['list', 'stats', 'insights'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 ${
              activeTab === tab
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'list' ? 'Patient List' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-3">
        {activeTab === 'list' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14px] font-bold text-foreground">Recent Cases</h3>
              <button className="text-[12px] text-primary font-medium">View All</button>
            </div>
            {mockCases.map((c) => (
              <div
                key={c.caseId}
                onClick={() => navigate(`/patient/${c.caseId}`)}
                className="group flex items-center justify-between p-3 bg-card border border-border rounded-xl active:scale-[0.98] transition-all cursor-pointer hover:shadow-card"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-avatar flex items-center justify-center text-primary-foreground font-bold text-[14px] shadow-sm">
                    {c.initials}
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-foreground">{c.patientName}</h4>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <GenderIcon gender={c.gender} size={12} />
                      {c.room} • {formatTimeAgo(c.lastModified)}
                    </p>
                  </div>
                </div>
                {/* BACKEND LOGIC — Department Badge
                   The department/specialty badge displayed on each
                   patient card must be dynamic, not hardcoded.

                   For each patient in Recent Cases:
                   1. Find their most recent case by admission date
                   2. Read the specialty/department field
                      directly from that case record
                   3. Display it as the badge

                   Source: case.specialty field in the database
                   No mapping needed — use the value as-is
                   END BACKEND LOGIC */}
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight uppercase ${c.tagColor}`}>
                  {c.department}
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'stats' && <StatsTab />}

        {activeTab === 'insights' && (
          <div className="space-y-3 py-4 animate-fade-in">
            {/* State 1: Ready */}
            {insightState === 'ready' && (
              <div className="p-10 flex flex-col items-center text-center">
                <button
                  onClick={handleStartAnalysis}
                  className="w-16 h-16 bg-[#2563EB]/10 rounded-full flex items-center justify-center mb-4 active:scale-90 transition-transform cursor-pointer"
                >
                  <Stethoscope size={32} className="text-[#2563EB] animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                </button>
                <h5 className="text-[16px] font-bold" style={{ color: '#1A2332' }}>Start Analysis</h5>
                <p className="text-[13px] mt-1 max-w-[220px]" style={{ color: '#6B7C93' }}>Tap to generate today's clinical summaries</p>
              </div>
            )}

            {/* State 2: Loading */}
            {insightState === 'loading' && (
              <div className="p-10 flex flex-col items-center text-center opacity-60">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Stethoscope size={32} className="text-muted-foreground animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <h5 className="text-[16px] font-bold" style={{ color: '#6B7C93' }}>AI Analysis in Progress</h5>
                <p className="text-[13px] mt-1 max-w-[240px]" style={{ color: '#94A3B8' }}>Generating daily clinical summaries for the pediatric ward.</p>
                <div className="mt-4 flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                  ))}
                </div>
              </div>
            )}

            {/* State 3: Results */}
            {insightState === 'done' && (
              <div className="space-y-3 animate-fade-in">
                {mockInsightResults.map((group) => {
                  const colors = statusColors[group.status];
                  return (
                    <div key={group.status} className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
                      <div className="px-4 py-2.5 flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                        <span className={`text-[13px] font-bold ${colors.text}`}>
                          {group.label} ({group.cases.length})
                        </span>
                      </div>
                      <div className="space-y-px">
                        {group.cases.map((c, idx) => (
                          <div key={idx} className="px-4 py-3 bg-card/50 border-t border-border/50">
                            <p className="text-[13px] font-semibold text-foreground mb-1">{c.name}</p>
                            <p className="text-[12px] text-muted-foreground leading-relaxed">{c.summary}</p>
                            <p className="text-[11px] font-medium text-primary mt-1.5">→ {c.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CasesScreen;
