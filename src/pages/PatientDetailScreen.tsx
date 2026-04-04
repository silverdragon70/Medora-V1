import { useContentSize } from '@/lib/useContentSize';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, FileText, Plus, Trash2 } from 'lucide-react';
import { patientService } from '@/services/patientService';
import { caseService } from '@/services/caseService';
import { mediaService } from '@/services/mediaService';
import type { Patient, Case } from '@/services/db/database';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const calcAge = (dob: string) => {
  const y = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return y < 1 ? `${Math.round(y * 12)}m` : `${Math.floor(y)}y`;
};

const outcomeBadgeMap: Record<string, { label: string; bg: string; color: string }> = {
  cured:       { label: 'Cured',       bg: '#DBEAFE', color: '#2563EB' },
  followup:    { label: 'Follow Up',   bg: '#FEF9C3', color: '#CA8A04' },
  referred:    { label: 'Referred',    bg: '#EDE9FE', color: '#7C3AED' },
  transferred: { label: 'Transferred', bg: '#E0F2FE', color: '#0369A1' },
  lama:        { label: 'LAMA',        bg: '#FEF3C7', color: '#D97706' },
  chronic:     { label: 'Chronic',     bg: '#F1F5F9', color: '#475569' },
  homecare:    { label: 'Home Care',   bg: '#ECFDF5', color: '#059669' },
  died:        { label: 'Died',        bg: '#FEE2E2', color: '#DC2626' },
};

const PatientDetailScreen = () => {
  const cs = useContentSize();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [imageCount, setImageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const p = await patientService.getById(id);
        if (!p) { setNotFound(true); return; }
        setPatient(p);

        const patientCases = await caseService.getByPatient(id);
        setCases(patientCases);

        // Count all images across all cases
        let total = 0;
        for (const c of patientCases) {
          total += await mediaService.count(c.id);
        }
        setImageCount(total);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const lastVisit = cases[0]?.admission_date
    ? new Date(cases[0].admission_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : '—';

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-[14px] text-muted-foreground">Loading...</p>
    </div>
  );

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await patientService.delete(id);
      toast.success('Patient deleted');
      navigate(-1);
    } catch {
      toast.error('Failed to delete patient');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (notFound || !patient) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <p className="text-[14px] text-muted-foreground">Patient not found.</p>
      <button onClick={() => navigate(-1)} className="text-primary text-[13px] font-semibold">Go Back</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 pb-3 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[16px] font-bold text-foreground">Patient Profile</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(`/patient/${id}/edit`)} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
            <Edit2 size={18} />
          </button>
          <button onClick={() => setShowDeleteDialog(true)} className="p-2 rounded-full hover:bg-muted text-destructive">
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      <div className="px-5 py-5 space-y-5 pb-10">
        {/* Patient Card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
          <div className="h-1 w-full gradient-brand" />
          <div className="p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl gradient-avatar flex items-center justify-center text-primary-foreground font-bold text-[22px]">
              {getInitials(patient.full_name)}
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-foreground">{patient.full_name}</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {calcAge(patient.dob)} • {patient.gender}
                {patient.file_number ? ` • ${patient.file_number}` : ''}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Since {new Date(patient.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-border">
            <div className="p-3 flex flex-col items-center border-r border-border">
              <span className="text-[18px] font-mono font-bold text-primary">{cases.length}</span>
              <span className="text-[9px] font-bold text-muted-foreground tracking-wider">CASES</span>
            </div>
            <div className="p-3 flex flex-col items-center border-r border-border">
              <span className="text-[18px] font-mono font-bold text-secondary">{imageCount}</span>
              <span className="text-[9px] font-bold text-muted-foreground tracking-wider">IMAGES</span>
            </div>
            <div className="p-3 flex flex-col items-center">
              <span className="text-[12px] font-mono font-bold text-foreground">{lastVisit}</span>
              <span className="text-[9px] font-bold text-muted-foreground tracking-wider">LAST VISIT</span>
            </div>
          </div>
        </div>

        {/* Case History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-foreground">Case History</h3>
            <span className="text-[11px] text-muted-foreground">{cases.length} record{cases.length !== 1 ? 's' : ''}</span>
          </div>

          {cases.length === 0 && (
            <div className="py-8 text-center text-[13px] text-muted-foreground">
              No cases yet for this patient.
            </div>
          )}

          {cases.map(c => {
            const outcome = c.discharge_outcome;
            const badge = outcome && outcomeBadgeMap[outcome] ? outcomeBadgeMap[outcome] : null;
            return (
              <div key={c.id} onClick={() => navigate(`/case/${c.id}`)}
                className="p-3 bg-card border border-border rounded-xl active:scale-[0.98] transition-all cursor-pointer hover:shadow-card">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center text-primary flex-shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`${cs.body} font-bold truncate`} style={{ color: '#1A2332' }}>
                        {c.provisional_diagnosis ?? c.final_diagnosis ?? 'No diagnosis'}
                      </h4>
                      {c.status === 'active' ? (
                        <span className="text-[11px] font-bold uppercase flex-shrink-0"
                          style={{ borderRadius: 20, padding: '4px 12px', backgroundColor: '#DCFCE7', color: '#16A34A' }}>
                          Active
                        </span>
                      ) : badge ? (
                        <span className="text-[11px] font-bold uppercase flex-shrink-0"
                          style={{ borderRadius: 20, padding: '4px 12px', backgroundColor: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold uppercase flex-shrink-0"
                          style={{ borderRadius: 20, padding: '4px 12px', backgroundColor: '#F1F5F9', color: '#64748B' }}>
                          Discharged
                        </span>
                      )}
                    </div>
                    <p className={`${cs.label} mt-0.5`} style={{ color: '#6B7C93' }}>
                      {c.chief_complaint ?? '—'} • {new Date(c.admission_date).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{patient.full_name}</strong>? This will permanently delete the patient and all their cases, investigations, and data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PatientDetailScreen;
