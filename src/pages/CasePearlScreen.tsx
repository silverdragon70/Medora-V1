import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, RotateCw, Loader2, AlertCircle, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { aiService } from '@/services/ai/aiService';
import { getErrorMessage } from '@/services/ai/aiErrorHandler';
import { AIError } from '@/types/ai.types';
import AILoadingState from '@/components/AILoadingState';
import AIPromptPreviewSheet from '@/components/AIPromptPreviewSheet';
import type { CasePearlResponse } from '@/types/ai.types';

// ── Sub-components ─────────────────────────────────────────────────────────────

const SeverityBadge = ({ severity }: { severity: 'severe' | 'moderate' | 'mild' }) => {
  const colors = {
    severe:   { bg: '#FEE2E2', text: '#DC2626' },
    moderate: { bg: '#FEF3C7', text: '#F59E0B' },
    mild:     { bg: '#F0FDF4', text: '#10B981' },
  };
  return (
    <span style={{ display: 'inline-block', background: colors[severity].bg,
      color: colors[severity].text, padding: '4px 10px', borderRadius: '20px',
      fontSize: '11px', fontWeight: 600 }}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
};

const CollapsibleSection = ({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: '14px',
      border: '1px solid var(--border-c)', overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/30 transition-colors"
        style={{ borderBottom: open ? '1px solid var(--border-c)' : 'none' }}>
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        {open
          ? <ChevronUp size={18} className="text-muted-foreground" />
          : <ChevronDown size={18} className="text-muted-foreground" />}
      </button>
      {open && <div className="px-4 py-4">{children}</div>}
    </div>
  );
};

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="space-y-3">
    {items.map((item, i) => (
      <li key={i} className="flex gap-3 text-[13px] leading-relaxed"
        style={{ color: 'var(--text-dark)' }}>
        <span className="w-[5px] h-[5px] rounded-full bg-primary flex-shrink-0 mt-[7px]" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const LOADING_STEPS = [
  { text: 'Fetching case data...',       active: false },
  { text: 'De-identifying patient...',   active: false },
  { text: 'Building clinical prompt...', active: false },
  { text: 'Calling AI model...',         active: false },
  { text: 'Parsing response...',         active: false },
];

// ── Main Screen ────────────────────────────────────────────────────────────────

const CasePearlScreen = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [rawError,    setRawError]    = useState<string | null>(null);
  const [data,        setData]        = useState<CasePearlResponse | null>(null);
  const [stepIndex,   setStepIndex]   = useState(0);
  const [steps,       setSteps]       = useState(LOADING_STEPS);
  const abortRef = useRef<AbortController | null>(null);

  const runAnalysis = async (skipCache = false) => {
    if (!id) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true); setError(null); setData(null);
    setSteps(LOADING_STEPS.map((s, i) => ({ ...s, active: i === 0 })));
    setStepIndex(0);

    // Animate loading steps
    const stepInterval = setInterval(() => {
      setStepIndex(prev => {
        const next = Math.min(prev + 1, LOADING_STEPS.length - 1);
        setSteps(LOADING_STEPS.map((s, i) => ({ ...s, active: i === next })));
        return next;
      });
    }, 800);

    try {
      const result = await aiService.generateCasePearl(id, {
        skipCache,
        signal: abortRef.current.signal,
      });
      setData(result);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      const raw = e instanceof Error ? e.message : String(e);
      const msg = e instanceof AIError ? getErrorMessage(e) : 'Analysis failed. Please try again.';
      setError(msg);
      setRawError(raw);
      toast.error(msg);
      console.error('[CasePearl Error]', raw);
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
    return () => { abortRef.current?.abort(); };
  }, [id]);

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 pb-3 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur-md"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[17px] font-bold text-foreground flex-1">CasePearl</h1>
        <button onClick={() => toast('Export coming soon')}
          className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
          <Download size={18} />
        </button>
        <button onClick={() => runAnalysis(true)} disabled={loading}
          className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors disabled:opacity-40">
          <RotateCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="px-5 py-5 space-y-4 pb-10 max-w-[430px] mx-auto">

        {/* Loading */}
        {loading && (
          <AILoadingState title="Analyzing case..." steps={steps} />
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle size={40} className="text-red-500 mb-4" />
            <p className="text-[14px] text-foreground text-center mb-2">{error}</p>
            {rawError && (
              <div className="mt-3 mx-4 px-3 py-2 rounded-xl bg-red-50 border border-red-200 w-full max-w-sm">
                <p className="text-[11px] font-mono text-red-600 break-all">{rawError}</p>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={() => navigate('/settings')}
                className="px-4 py-2.5 rounded-xl text-[13px] font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1.5">
                <Settings size={14} /> Go to Settings
              </button>
              <button onClick={() => runAnalysis(true)}
                className="px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && !error && data && (
          <>
            <CollapsibleSection title="Key Findings">
              <BulletList items={data.keyFindings} />
            </CollapsibleSection>

            {data.warningFlags.length > 0 && (
              <CollapsibleSection title="⚠️ Warning Flags">
                <div className="mb-3 px-3 py-2.5 rounded-xl"
                  style={{ background: '#FEF3C7', border: '1px solid #FED7AA' }}>
                  <p className="text-[12px] leading-relaxed" style={{ color: '#92400E' }}>
                    <strong>Alert:</strong> These findings require immediate attention.
                  </p>
                </div>
                <BulletList items={data.warningFlags} />
              </CollapsibleSection>
            )}

            {data.differentialDiagnosis.length > 0 && (
              <CollapsibleSection title="Differential Diagnosis">
                <BulletList items={data.differentialDiagnosis} />
              </CollapsibleSection>
            )}

            <CollapsibleSection title="Clinical Recommendations">
              <BulletList items={data.recommendations} />
            </CollapsibleSection>

            {data.drugInteractions.length > 0 && (
              <CollapsibleSection title="Drug Interactions" defaultOpen={false}>
                <div className="space-y-3">
                  {data.drugInteractions.map((d, i) => (
                    <div key={i} className="p-3 rounded-xl"
                      style={{ background: 'var(--field-bg)', border: '1px solid var(--border-c)' }}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-dark)' }}>
                          {d.drugs}
                        </span>
                        <SeverityBadge severity={d.severity} />
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-1">
                        <strong>Effect:</strong> {d.effect}
                      </p>
                      <p className="text-[12px] text-primary mt-1">
                        <strong>Recommendation:</strong> {d.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            <CollapsibleSection title="Follow-up Plan">
              <div className="mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Timing</p>
                <p className="text-[14px] font-semibold text-foreground">{data.followUp.timing}</p>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Actions</p>
              <BulletList items={data.followUp.actions} />
            </CollapsibleSection>

            <CollapsibleSection title="Disease Review" defaultOpen={false}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Key Points</p>
              <BulletList items={data.diseaseReview.keyPoints} />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-4 mb-2">References</p>
              <BulletList items={data.diseaseReview.references} />
            </CollapsibleSection>

            {data.disclaimer && (
              <p className="text-[11px] text-muted-foreground text-center px-4 pb-2 leading-relaxed">
                ⚕️ {data.disclaimer}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CasePearlScreen;
