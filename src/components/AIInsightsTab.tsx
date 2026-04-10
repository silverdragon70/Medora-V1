import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { aiService } from '@/services/ai/aiService';
import { getErrorMessage } from '@/services/ai/aiErrorHandler';
import { AIError } from '@/types/ai.types';
import { caseService } from '@/services/caseService';

// ── Types ──────────────────────────────────────────────────────────────────────

export type InsightState = 'ready' | 'loading' | 'done' | 'error';

export interface CaseInsight {
  caseId: string;
  diagnosis: { provisional: string; final: string | null };
  status: 'improving' | 'deteriorating' | 'stable';
  statusReason: string;
  recommendations: string[];
  warningFlags: string[];
}

export interface InsightsResult {
  insights: CaseInsight[];
  disclaimer?: string;
}

// ── Status badge ───────────────────────────────────────────────────────────────

const statusConfig = {
  improving:     { label: 'Improving',     bg: '#DCFCE7', color: '#16A34A' },
  deteriorating: { label: 'Deteriorating', bg: '#FEE2E2', color: '#DC2626' },
  stable:        { label: 'Stable',        bg: '#EDE9FE', color: '#7C3AED' },
};

const InsightCard = ({ insight }: { insight: CaseInsight }) => {
  const navigate = useNavigate();
  const s = statusConfig[insight.status] ?? statusConfig.stable;
  return (
    <div onClick={() => navigate(`/case/${insight.caseId}`)}
      className="bg-card border border-border rounded-xl p-4 space-y-3 cursor-pointer active:scale-[0.98] transition-all hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-[14px] font-bold text-foreground flex-1">
          {insight.diagnosis.provisional || insight.diagnosis.final || 'Unknown diagnosis'}
        </h4>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: s.bg, color: s.color }}>
          {s.label}
        </span>
      </div>
      <p className="text-[12px] text-muted-foreground">{insight.statusReason}</p>
      {insight.recommendations.length > 0 && (
        <ul className="space-y-1">
          {insight.recommendations.map((r, i) => (
            <li key={i} className="flex gap-2 text-[12px] text-muted-foreground">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0 mt-[6px]" />
              {r}
            </li>
          ))}
        </ul>
      )}
      {insight.warningFlags.length > 0 && (
        <div className="space-y-1">
          {insight.warningFlags.map((f, i) => (
            <p key={i} className="text-[12px] font-medium text-red-500">⚠️ {f}</p>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

interface AIInsightsTabProps {
  insightState: InsightState;
  result: InsightsResult | null;
  onStateChange: (state: InsightState) => void;
  onResultChange: (result: InsightsResult | null) => void;
}

const AIInsightsTab = ({ insightState, result, onStateChange, onResultChange }: AIInsightsTabProps) => {
  const navigate = useNavigate();

  const handleStart = useCallback(async (skipCache = false) => {
    onStateChange('loading');
    try {
      const allCases = await caseService.getAll();
      const activeCases = allCases.filter(c => c.status === 'active').slice(0, 10);
      if (activeCases.length === 0) {
        toast('No active cases to analyze');
        onStateChange('ready');
        return;
      }
      const response = await aiService.generateInsights(
        activeCases.map(c => c.id),
        { skipCache }
      );
      onResultChange(response as InsightsResult);
      onStateChange('done');
    } catch (e: any) {
      const msg = e instanceof AIError ? getErrorMessage(e) : 'Analysis failed';
      toast.error(msg);
      onStateChange('error');
    }
  }, [onStateChange, onResultChange]);

  return (
    <div className="space-y-3 py-4 animate-fade-in">

      {/* Ready */}
      {insightState === 'ready' && (
        <div className="p-10 flex flex-col items-center text-center">
          <button onClick={() => handleStart(false)}
            className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 active:scale-90 transition-transform">
            <Stethoscope size={32} className="text-primary animate-pulse" />
          </button>
          <h5 className="text-[16px] font-bold text-foreground">Start Analysis</h5>
          <p className="text-[13px] mt-1 max-w-[220px] text-muted-foreground">
            Tap to generate today's clinical summaries
          </p>
        </div>
      )}

      {/* Loading */}
      {insightState === 'loading' && (
        <div className="p-10 flex flex-col items-center text-center opacity-70">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Stethoscope size={32} className="text-muted-foreground"
              style={{ animation: 'spin 3s linear infinite' }} />
          </div>
          <h5 className="text-[16px] font-bold text-muted-foreground">AI Analysis in Progress</h5>
          <div className="mt-4 flex gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse"
                style={{ animationDelay: `${i * 0.3}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {insightState === 'error' && (
        <div className="p-6 text-center space-y-3">
          <p className="text-[13px] text-muted-foreground">AI Insights require a valid API key.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => navigate('/settings')}
              className="text-[13px] text-primary font-semibold">
              Go to Settings →
            </button>
            <span className="text-muted-foreground">|</span>
            <button onClick={() => handleStart(true)}
              className="text-[13px] text-primary font-semibold flex items-center gap-1">
              <RotateCw size={12} /> Retry
            </button>
          </div>
        </div>
      )}

      {/* Done */}
      {insightState === 'done' && result && (
        <>
          <div className="flex items-center justify-between px-1">
            <p className="text-[12px] text-muted-foreground">
              Today's analysis: <strong>{result.insights.length}</strong> active case{result.insights.length !== 1 ? 's' : ''}
            </p>
            <button onClick={() => handleStart(true)}
              className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground">
              <RotateCw size={14} />
            </button>
          </div>
          {result.insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
          {result.disclaimer && (
            <p className="text-[11px] text-muted-foreground text-center px-4 pb-2 leading-relaxed">
              ⚕️ {result.disclaimer}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default AIInsightsTab;
