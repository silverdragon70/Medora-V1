import React, { useState } from 'react'; // v2
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, SearchX, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type TimePeriod = 'last_week' | 'last_month' | 'last_3_months' | 'last_6_months' | 'last_year' | 'all_time' | 'custom';
type Outcome = 'all' | 'active' | 'improved' | 'died';
type ScreenState = 'empty' | 'loading' | 'results' | 'error' | 'no_cases';

const timePeriodOptions: { value: TimePeriod; label: string }[] = [
  { value: 'last_week', label: 'Last Week' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'all_time', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

const outcomeOptions: { value: Outcome; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'improved', label: 'Improved' },
  { value: 'died', label: 'Died' },
];

const mockResults = {
  caseCount: 24,
  summary: 'Analysis of 24 cases of Bronchiolitis over the last 3 months reveals a predominance in infants aged 2–8 months, with peak admissions in January. RSV was the most common identified pathogen (67%). Average length of stay was 4.2 days.',
  patterns: [
    'Most cases presented with nasal congestion (92%) followed by wheezing (83%) and feeding difficulty (71%).',
    'Oxygen therapy was required in 58% of cases, with an average duration of 2.3 days.',
    'Nebulized hypertonic saline was used in 46% of cases, though evidence remains inconclusive.',
    'Readmission rate within 7 days was 8.3% (2 cases).',
    'Infants under 3 months had longer hospital stays (mean 5.8 days vs 3.1 days).',
  ],
  comparison: {
    improved: 'Average recovery time was 3.8 days. Key factors: early supportive care, adequate hydration, and parental education on suctioning techniques. 87% were discharged without complications.',
    notImproved: '3 cases required PICU transfer due to respiratory failure. Risk factors included prematurity (<32 weeks), congenital heart disease, and age <6 weeks at presentation.',
  },
  pearls: [
    'Bronchiolitis severity scoring (Wang score) at admission correlates with need for oxygen therapy — consider routine use for triage.',
    'Deep suctioning before feeds significantly reduces feeding difficulty and may shorten hospital stay.',
    'Parental anxiety is a major driver of ED revisits — structured discharge counseling reduces readmission by 40%.',
    'Trial of high-flow nasal cannula (HFNC) before CPAP is now recommended in AAP 2024 guidelines.',
  ],
  diseaseReview: {
    source: 'AAP 2024 Guidelines',
    definition: 'Bronchiolitis is a lower respiratory tract infection caused by viral infection of the small airways (bronchioles), predominantly affecting children under 2 years of age.',
    symptoms: 'Initial rhinorrhea and cough progressing to tachypnea, wheezing, crackles, increased work of breathing, and feeding difficulty. Apnea may occur in young infants.',
    diagnosis: 'Clinical diagnosis based on history and physical examination. Routine laboratory tests or radiographs are not recommended. RSV testing may be useful for cohorting purposes.',
    treatment: 'Supportive care is the mainstay: nasal suctioning, adequate hydration, and oxygen supplementation if SpO₂ <90%. Bronchodilators, corticosteroids, and antibiotics are NOT routinely recommended.',
    redFlags: 'Apnea episodes, severe respiratory distress (RR >70, grunting, nasal flaring), inability to feed, SpO₂ <90% on room air, lethargy, and age <6 weeks or history of prematurity.',
    latestGuidelines: 'AAP 2024 update emphasizes HFNC as first-line escalation before CPAP, discourages routine use of chest X-rays and blood tests, and recommends discharge when SpO₂ ≥90% on room air for ≥4 hours.',
  },
};

const PillButton = ({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
      selected
        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
    )}
  >
    {children}
  </button>
);

const GroupPearlScreen = () => {
  const navigate = useNavigate();
  // Filter state
  const [diagnosis, setDiagnosis] = useState('');
  const [timePeriod, setTimePeriod] = useState<TimePeriod | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [showValidation, setShowValidation] = useState(false);

  // Screen state
  const [screenState, setScreenState] = useState<ScreenState>('empty');

  const hasFilters = diagnosis.trim() !== '' || timePeriod !== null || outcome !== null;

  const handleGenerate = async () => {
    if (!hasFilters) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    setScreenState('loading');
    // Check for API key in settings
    const { settingsService } = await import('@/services/settingsService');
    const apiKey = await settingsService.get('aiApiKey');
    if (!apiKey) {
      setScreenState('error');
      return;
    }
    // Real AI call would go here
    setTimeout(() => setScreenState('results'), 2500);
  };

  const getTimePeriodLabel = () => {
    if (!timePeriod) return null;
    if (timePeriod === 'custom') {
      const from = customFrom ? format(customFrom, 'MMM d') : '...';
      const to = customTo ? format(customTo, 'MMM d') : '...';
      return `${from} — ${to}`;
    }
    return timePeriodOptions.find((o) => o.value === timePeriod)?.label;
  };

  return (
      <div className="px-4 py-4 space-y-4 pb-24 animate-fade-in">
          {/* FILTER CARD */}
          <div className="bg-card rounded-[18px] shadow-card p-4 space-y-4 border border-border/50">
            <h2 className="text-sm font-semibold text-foreground">Filters</h2>

            {/* Diagnosis */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Diagnosis</label>
              <Input
                placeholder="e.g. Bronchiolitis, Pneumonia..."
                value={diagnosis}
                onChange={(e) => {
                  setDiagnosis(e.target.value);
                  if (showValidation) setShowValidation(false);
                }}
                className="h-10 rounded-xl border-border bg-muted/30 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary focus-visible:border-primary"
              />
            </div>

            {/* Time Period */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Time Period</label>
              <div className="flex flex-wrap gap-1.5">
                {timePeriodOptions.map((opt) => (
                  <PillButton
                    key={opt.value}
                    selected={timePeriod === opt.value}
                    onClick={() => {
                      setTimePeriod(timePeriod === opt.value ? null : opt.value);
                      if (showValidation) setShowValidation(false);
                    }}
                  >
                    {opt.label}
                  </PillButton>
                ))}
              </div>
              {/* Custom date pickers */}
              {timePeriod === 'custom' && (
                <div className="flex gap-2 mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'flex-1 h-9 rounded-xl text-xs justify-start font-normal',
                          !customFrom && 'text-muted-foreground'
                        )}
                      >
                        {customFrom ? format(customFrom, 'MMM d, yyyy') : 'From'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customFrom}
                        onSelect={setCustomFrom}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'flex-1 h-9 rounded-xl text-xs justify-start font-normal',
                          !customTo && 'text-muted-foreground'
                        )}
                      >
                        {customTo ? format(customTo, 'MMM d, yyyy') : 'To'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={customTo}
                        onSelect={setCustomTo}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Outcome */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Outcome</label>
              <div className="flex flex-wrap gap-1.5">
                {outcomeOptions.map((opt) => (
                  <PillButton
                    key={opt.value}
                    selected={outcome === opt.value}
                    onClick={() => {
                      setOutcome(outcome === opt.value ? null : opt.value);
                      if (showValidation) setShowValidation(false);
                    }}
                  >
                    {opt.label}
                  </PillButton>
                ))}
              </div>
            </div>

            {/* Validation error */}
            {showValidation && !hasFilters && (
              <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-xl px-3 py-2.5 text-xs font-medium animate-fade-in">
                <AlertCircle size={14} />
                Please select at least one filter
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={screenState === 'loading'}
              className={cn(
                'w-full h-11 rounded-xl text-sm font-semibold transition-all',
                hasFilters
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-brand'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {screenState === 'loading' ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : (
                <span className="mr-1.5">💡</span>
              )}
              {screenState === 'loading' ? 'Analyzing...' : 'Generate Clinical Pearls'}
            </Button>
          </div>

          {/* LOADING STATE */}
          {screenState === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Loader2 className="animate-spin text-primary" size={28} />
              </div>
              <p className="text-sm font-semibold text-foreground">Analyzing cases...</p>
              <p className="text-xs text-muted-foreground mt-1">Fetching patterns & latest guidelines</p>
            </div>
          )}

          {/* ERROR STATE */}
          {screenState === 'error' && (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="text-destructive" size={28} />
              </div>
              <p className="text-sm font-semibold text-foreground">Something went wrong</p>
              <p className="text-xs text-muted-foreground mt-1 text-center px-8">
                Could not complete analysis. Please check your connection and try again.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-xl gap-2"
                onClick={() => {
                  setScreenState('empty');
                }}
              >
                <RefreshCw size={14} />
                Try Again
              </Button>
            </div>
          )}

          {/* NO CASES STATE */}
          {screenState === 'no_cases' && (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <SearchX className="text-muted-foreground" size={28} />
              </div>
              <p className="text-sm font-semibold text-foreground">No cases found</p>
              <p className="text-xs text-muted-foreground mt-1 text-center px-8">
                No matching cases for the selected filters. Try adjusting your criteria.
              </p>
            </div>
          )}

          {/* RESULTS */}
          {screenState === 'results' && (
            <div className="space-y-3 animate-fade-in">
              {/* Summary Card */}
              <div className="bg-card rounded-[18px] shadow-card p-4 border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Summary</h3>
                  <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-semibold hover:bg-primary/10">
                    {mockResults.caseCount} cases
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {diagnosis && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                      {diagnosis}
                    </span>
                  )}
                  {getTimePeriodLabel() && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                      {getTimePeriodLabel()}
                    </span>
                  )}
                  {outcome && outcome !== 'all' && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium capitalize">
                      {outcome}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{mockResults.summary}</p>
              </div>

              {/* Common Patterns Card */}
              <div className="bg-card rounded-[18px] shadow-card p-4 border border-border/50 space-y-3">
                <h3 className="text-sm font-bold text-foreground">📊 Common Patterns</h3>
                <ul className="space-y-2">
                  {mockResults.patterns.map((pattern, i) => (
                    <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {pattern}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Comparison Card */}
              <div className="bg-card rounded-[18px] shadow-card p-4 border border-border/50 space-y-3">
                <h3 className="text-sm font-bold text-foreground">⚖️ Comparison</h3>
                {/* Improved */}
                <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">✅</span>
                    <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">
                      Improved
                    </span>
                  </div>
                  <p className="text-xs text-green-800 dark:text-green-300/80 leading-relaxed">
                    {mockResults.comparison.improved}
                  </p>
                </div>
                {/* Not Improved */}
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">⚠️</span>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                      Not Improved
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300/80 leading-relaxed">
                    {mockResults.comparison.notImproved}
                  </p>
                </div>
              </div>

              {/* Clinical Pearls Card */}
              <div className="bg-card rounded-[18px] shadow-card p-4 border border-border/50 space-y-3">
                <h3 className="text-sm font-bold text-foreground">💡 Clinical Pearls</h3>
                <div className="space-y-2">
                  {mockResults.pearls.map((pearl, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-accent/50 border-l-[3px] border-l-primary p-3"
                    >
                      <p className="text-xs text-foreground/80 leading-relaxed">{pearl}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disease Review Card */}
              <div className="bg-card rounded-[18px] shadow-card p-4 border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">🌐 Disease Review</h3>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {mockResults.diseaseReview.source}
                  </span>
                </div>
                <div className="space-y-3">
                  {([
                    { key: 'definition' as const, label: 'Definition', isRed: false },
                    { key: 'symptoms' as const, label: 'Symptoms', isRed: false },
                    { key: 'diagnosis' as const, label: 'Diagnosis', isRed: false },
                    { key: 'treatment' as const, label: 'Treatment', isRed: false },
                    { key: 'redFlags' as const, label: 'Red Flags', isRed: true },
                    { key: 'latestGuidelines' as const, label: 'Latest Guidelines', isRed: false },
                  ]).map(({ key, label, isRed }) => (
                    <div
                      key={key}
                      className={cn(
                        'rounded-xl p-3 space-y-1',
                        isRed
                          ? 'bg-destructive/8 dark:bg-destructive/15'
                          : 'bg-muted/40'
                      )}
                    >
                      <p
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-wider',
                          isRed ? 'text-destructive' : 'text-primary'
                        )}
                      >
                        {label}
                      </p>
                      <p className={cn(
                        'text-xs leading-relaxed',
                        isRed ? 'text-destructive/80 dark:text-destructive/70' : 'text-muted-foreground'
                      )}>
                        {mockResults.diseaseReview[key]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
      </div>
  );
};

export default GroupPearlScreen;
