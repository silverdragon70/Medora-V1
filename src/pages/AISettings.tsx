import {
  ArrowLeft, Bot, Key, Brain, Languages, Zap, ChevronRight,
  Eye, EyeOff, Check, FileText, Loader2, Trash2, Clock, HelpCircle
} from "lucide-react";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { settingsService } from "@/services/settingsService";
import { testConnection } from "@/services/ai/aiService";
import { rateLimiter } from "@/services/ai/aiRateLimiter";

// ── Shared sub-components ──────────────────────────────────────────────────────

const SettingsRow = ({ icon: Icon, iconColor, iconBg, label, value, onClick, trailing }: {
  icon: React.ElementType; iconColor: string; iconBg: string;
  label: string; value: string; onClick?: () => void;
  trailing?: React.ReactNode;
}) => (
  <button onClick={onClick}
    className="w-full flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-muted/40">
    <div className={`w-9 h-9 rounded-[10px] ${iconBg} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
    </div>
    <div className="flex-1 text-left">
      <div className="text-[14px] font-semibold text-foreground">{label}</div>
      <div className="text-[12px] text-muted-foreground">{value}</div>
    </div>
    {trailing ?? <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />}
  </button>
);

const PickerSheet = ({ open, onOpenChange, title, children }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  title: string; children: React.ReactNode;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl p-0 overflow-hidden bg-card border border-border">
      <DialogHeader className="px-5 pt-5 pb-2">
        <DialogTitle className="text-[16px] font-bold text-foreground">{title}</DialogTitle>
      </DialogHeader>
      <div className="max-h-[60vh] overflow-y-auto">{children}</div>
    </DialogContent>
  </Dialog>
);

const divider = <div className="border-b border-border" />;

// ── Data ───────────────────────────────────────────────────────────────────────

const providers = [
  { id: "gemini",      label: "Google Gemini", tag: "Free"     },
  { id: "huggingface", label: "Hugging Face",  tag: "Free"     },
  { id: "anthropic",   label: "Anthropic",     tag: "Paid"     },
  { id: "openai",      label: "OpenAI",        tag: "Paid"     },
  { id: "groq",        label: "Groq",          tag: "Free"     },
  { id: "openrouter",  label: "OpenRouter",    tag: "Freemium" },
  { id: "custom",      label: "Custom",        tag: ""         },
] as const;

const modelsByProvider: Record<string, string[]> = {
  gemini:      ["gemini-1.5-flash", "gemini-1.5-pro"],
  huggingface: ["Llama-3.1-70B-Instruct", "Mixtral-8x7B-Instruct", "Qwen2.5-72B-Instruct", "Gemma-2-27b-it"],
  anthropic:   ["claude-3-haiku-20240307", "claude-3-5-sonnet-20241022", "claude-3-opus-20240229"],
  openai:      ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo-preview"],
  groq:        ["mixtral-8x7b-32768", "llama-3.1-70b-versatile"],
  openrouter:  ["meta-llama/llama-3.1-8b-instruct:free", "anthropic/claude-3.5-sonnet"],
  custom:      ["user-defined"],
};

const rateLimitOptions = ["3 requests/min", "5 requests/min", "10 requests/min", "Unlimited"];
const aiFeatures = ["Insights", "CasePearl", "GroupPearl"];

const tagClass = (tag: string) =>
  tag === "Free"     ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
  tag === "Paid"     ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
  tag === "Freemium" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground";

// ── Main Component ─────────────────────────────────────────────────────────────

const AISettings = () => {
  const navigate = useNavigate();

  const [featuresEnabled,     setFeaturesEnabled]     = useState(true);
  const [promptPreviewEnabled,setPromptPreviewEnabled] = useState(false);
  const [selectedProvider,    setSelectedProvider]    = useState("anthropic");
  const [selectedModel,       setSelectedModel]       = useState("claude-3-5-sonnet-20241022");
  const [rateLimit,           setRateLimit]           = useState("3 requests/min");
  const [apiKeys,             setApiKeys]             = useState<Record<string, string>>({});
  const [tempKey,             setTempKey]             = useState("");
  const [showKey,             setShowKey]             = useState(false);
  const [isTesting,           setIsTesting]           = useState(false);

  // Load settings from Dexie on mount
  React.useEffect(() => {
    const load = async () => {
      const [provider, model, key, features, preview, limit] = await Promise.all([
        settingsService.get('aiProvider'),
        settingsService.get('aiModel'),
        settingsService.get('apiKey'),
        settingsService.get('aiFeatures'),
        settingsService.get('showAIPromptPreview'),
        settingsService.get('aiRateLimit'),
      ]);
      if (provider) setSelectedProvider(provider);
      if (model)    setSelectedModel(model);
      if (key)      setApiKeys(prev => ({ ...prev, [provider ?? 'anthropic']: key }));
      if (features) setFeaturesEnabled(features !== 'false');
      if (preview)  setPromptPreviewEnabled(preview === 'true');
      if (limit)    setRateLimit(limit);
    };
    load();
  }, []);

  const [showApiKeyDialog,    setShowApiKeyDialog]    = useState(false);
  const [showProviderSheet,   setShowProviderSheet]   = useState(false);
  const [showModelSheet,      setShowModelSheet]      = useState(false);
  const [showRateLimitSheet,  setShowRateLimitSheet]  = useState(false);
  const [showClearCacheDialog,setShowClearCacheDialog]= useState(false);

  const currentProviderLabel = providers.find(p => p.id === selectedProvider)?.label ?? selectedProvider;
  const currentKeySet = !!apiKeys[selectedProvider];

  const handleSaveKey = useCallback(async () => {
    if (!tempKey.trim()) return;
    setApiKeys(prev => ({ ...prev, [selectedProvider]: tempKey }));
    await settingsService.set('apiKey', tempKey);
    setShowApiKeyDialog(false); setTempKey(""); setShowKey(false);
    toast.success("API key saved securely on-device");
  }, [tempKey, selectedProvider]);

  const handleClearKey = useCallback(async () => {
    setApiKeys(prev => { const n = { ...prev }; delete n[selectedProvider]; return n; });
    await settingsService.set('apiKey', '');
    setTempKey(""); setShowKey(false);
    toast("API key removed");
  }, [selectedProvider]);

  const handleSelectProvider = useCallback((id: string) => {
    setSelectedProvider(id);
    setSelectedModel(modelsByProvider[id]?.[0] ?? "");
    settingsService.set('aiProvider', id);
    setShowProviderSheet(false);
    toast.success(`Provider set to ${providers.find(p => p.id === id)?.label}`);
  }, []);

  const handleSelectModel = useCallback((model: string) => {
    setSelectedModel(model);
    settingsService.set('aiModel', model);
    setShowModelSheet(false);
    toast.success(`Model set to ${model}`);
  }, []);

  const handleSelectRateLimit = useCallback((limit: string) => {
    setRateLimit(limit);
    settingsService.set('aiRateLimit', limit);
    // Update in-memory rate limiter
    const num = limit === 'Unlimited' ? 999 : parseInt(limit);
    if (!isNaN(num)) rateLimiter.setLimit(num);
    setShowRateLimitSheet(false);
    toast.success(`Rate limit set to ${limit}`);
  }, []);

  const handleTestConnection = useCallback(async () => {
    if (!currentKeySet) { toast.error("No API key set for this provider"); return; }
    setIsTesting(true);
    try {
      const apiKey = apiKeys[selectedProvider] ?? '';
      const ok = await testConnection(selectedProvider, apiKey, selectedModel);
      ok ? toast.success("Connection successful! ✓") : toast.error("Connection failed. Check your API key.");
    } catch { toast.error("Connection failed. Check your API key."); }
    finally { setIsTesting(false); }
  }, [currentKeySet, apiKeys, selectedProvider, selectedModel]);

  const handleClearCache = useCallback(() => {
    Object.keys(localStorage).forEach(k => { if (k.startsWith('ai_cache_')) localStorage.removeItem(k); });
    setShowClearCacheDialog(false);
    toast.success("AI cache cleared");
  }, []);

  const openApiKeyDialog = useCallback(() => {
    setTempKey(apiKeys[selectedProvider] ?? "");
    setShowKey(false); setShowApiKeyDialog(true);
  }, [apiKeys, selectedProvider]);

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 pb-3 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur-md"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[17px] font-bold text-foreground tracking-tight">AI Settings</h1>
      </header>

      <div className="px-5 py-5 space-y-5 pb-10 max-w-[430px] mx-auto">

        <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground px-1">AI Integration</p>

        {/* Main card */}
        <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-card">
          <SettingsRow icon={Zap} iconColor="text-red-500" iconBg="bg-red-500/10"
            label="AI Features" value={aiFeatures.join(", ")}
            trailing={<Switch checked={featuresEnabled} onCheckedChange={v => { setFeaturesEnabled(v); settingsService.set('aiFeatures', String(v)); }} onClick={e => e.stopPropagation()} />} />
          {divider}
          <SettingsRow icon={Bot} iconColor="text-primary" iconBg="bg-primary/10"
            label="AI Provider" value={currentProviderLabel} onClick={() => setShowProviderSheet(true)} />
          {divider}
          <SettingsRow icon={Key} iconColor="text-purple-500" iconBg="bg-purple-500/10"
            label="API Key" value={currentKeySet ? "••••••••" : "Not set"}
            onClick={openApiKeyDialog}
            trailing={currentKeySet
              ? <Check size={16} className="text-green-500 flex-shrink-0" />
              : <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />} />
          {divider}
          <SettingsRow icon={Brain} iconColor="text-purple-500" iconBg="bg-purple-500/10"
            label="AI Model" value={selectedModel} onClick={() => setShowModelSheet(true)} />
          {divider}
          <SettingsRow icon={Languages} iconColor="text-primary" iconBg="bg-primary/10"
            label="AI Response Language" value="English" />
          {divider}
          <SettingsRow icon={Clock} iconColor="text-amber-500" iconBg="bg-amber-500/10"
            label="Rate Limit" value={rateLimit} onClick={() => setShowRateLimitSheet(true)} />
          {divider}
          <SettingsRow icon={Trash2} iconColor="text-red-500" iconBg="bg-red-500/10"
            label="Clear AI Cache" value="Free up storage" onClick={() => setShowClearCacheDialog(true)} />
        </div>

        {/* Prompt Preview card */}
        <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-card">
          <div className="w-full flex items-center gap-3.5 px-4 py-3.5">
            <div className="w-9 h-9 rounded-[10px] bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-primary" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[14px] font-semibold text-foreground">Show AI Prompt Preview</div>
              <div className="text-[12px] text-muted-foreground">Preview prompts before sending to AI</div>
            </div>
            <Switch checked={promptPreviewEnabled}
              onCheckedChange={v => { setPromptPreviewEnabled(v); settingsService.set('showAIPromptPreview', String(v)); }}
              onClick={e => e.stopPropagation()} />
          </div>
        </div>

        {/* Test Connection */}
        <button onClick={handleTestConnection} disabled={isTesting}
          className="w-full h-11 rounded-xl text-[14px] font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
          {isTesting ? <><Loader2 size={16} className="animate-spin" />Testing...</> : "Test Connection"}
        </button>

        {/* Security note */}
        <div className="px-4 py-3 rounded-xl text-[12px] text-muted-foreground leading-relaxed bg-accent border border-primary/15">
          <span className="font-semibold text-primary">Note:</span> AI features require a valid API key.
          Your key is stored securely on-device and never sent to our servers.
        </div>
      </div>

      {/* ── Dialogs ── */}

      {/* API Key */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl p-5 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-bold text-foreground">Enter API Key</DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              Key for {currentProviderLabel}. Stored on-device only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="relative">
              <Input type={showKey ? "text" : "password"} value={tempKey}
                onChange={e => setTempKey(e.target.value)} placeholder="sk-..."
                className="pr-10 text-[13px] font-mono bg-background border-border" />
              <button type="button" onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveKey} disabled={!tempKey.trim()}
                className="flex-1 h-9 rounded-xl text-[13px] font-semibold bg-primary text-primary-foreground disabled:opacity-40 transition-colors">
                Save Key
              </button>
              {(tempKey || currentKeySet) && (
                <button onClick={handleClearKey}
                  className="h-9 px-3 rounded-xl text-[13px] font-medium text-red-500 bg-red-500/10 transition-colors">
                  Clear
                </button>
              )}
            </div>
            <button onClick={() => { setShowApiKeyDialog(false); navigate('/get-api-key'); }}
              className="w-full text-[13px] text-primary flex items-center justify-center gap-1 hover:underline transition-colors">
              <HelpCircle size={14} /> Need help? Get API Key →
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Provider */}
      <PickerSheet open={showProviderSheet} onOpenChange={setShowProviderSheet} title="Select AI Provider">
        {providers.map((p, i) => (
          <button key={p.id} onClick={() => handleSelectProvider(p.id)}
            className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/40"
            style={{ borderBottom: i < providers.length - 1 ? '1px solid var(--border-c)' : 'none' }}>
            <span className="text-[14px] font-medium text-foreground">{p.label}</span>
            <div className="flex items-center gap-2">
              {p.tag && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${tagClass(p.tag)}`}>{p.tag}</span>}
              {selectedProvider === p.id && <Check size={16} className="text-primary" />}
            </div>
          </button>
        ))}
      </PickerSheet>

      {/* Model */}
      <PickerSheet open={showModelSheet} onOpenChange={setShowModelSheet} title="Select AI Model">
        {(modelsByProvider[selectedProvider] ?? []).map((m, i, arr) => (
          <button key={m} onClick={() => handleSelectModel(m)}
            className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/40"
            style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border-c)' : 'none' }}>
            <span className="text-[13px] font-mono text-foreground">{m}</span>
            {selectedModel === m && <Check size={16} className="text-primary" />}
          </button>
        ))}
      </PickerSheet>

      {/* Rate Limit */}
      <PickerSheet open={showRateLimitSheet} onOpenChange={setShowRateLimitSheet} title="Rate Limit">
        {rateLimitOptions.map((opt, i) => (
          <button key={opt} onClick={() => handleSelectRateLimit(opt)}
            className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/40"
            style={{ borderBottom: i < rateLimitOptions.length - 1 ? '1px solid var(--border-c)' : 'none' }}>
            <span className="text-[14px] font-medium text-foreground">{opt}</span>
            {rateLimit === opt && <Check size={16} className="text-primary" />}
          </button>
        ))}
      </PickerSheet>

      {/* Clear Cache */}
      <AlertDialog open={showClearCacheDialog} onOpenChange={setShowClearCacheDialog}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[16px] font-bold text-foreground">Clear AI Cache?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-muted-foreground">
              This will remove all cached AI responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearCache}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white">
              Clear Cache
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AISettings;
