import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { providerGuides, providerKeys, tierBadge } from "@/services/ai/providersData";

const GetAPIKeyScreen = () => {
  const navigate = useNavigate();
  const [selectedProvider, setSelectedProvider] = useState("gemini");
  const [copiedUrl, setCopiedUrl] = useState(false);

  const guide = providerGuides[selectedProvider];
  const badge = tierBadge[guide.tier];

  const handleCopyUrl = async () => {
    if (!guide.website) return;
    await navigator.clipboard.writeText(guide.website);
    setCopiedUrl(true);
    toast.success("Copied!");
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 pb-3 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur-md"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[17px] font-bold text-foreground tracking-tight">Get API Key</h1>
      </header>

      {/* Content */}
      <div className="px-5 py-5 space-y-5 pb-10 max-w-[430px] mx-auto">

        {/* Provider Selector */}
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
            Select Provider
          </p>
          <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-card">
            {providerKeys.map((key, i) => {
              const p = providerGuides[key];
              const b = tierBadge[p.tier];
              const isSelected = selectedProvider === key;
              return (
                <button key={key} onClick={() => { setSelectedProvider(key); setCopiedUrl(false); }}
                  className="w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-muted/40"
                  style={{
                    borderBottom: i < providerKeys.length - 1 ? '1px solid var(--border-c)' : 'none',
                    background: isSelected ? 'hsl(var(--accent))' : undefined,
                  }}>
                  <span className={`text-[14px] font-medium ${isSelected ? 'text-primary font-semibold' : 'text-foreground'}`}>
                    {p.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${b.className}`}>
                      {b.label}
                    </span>
                    {isSelected && <Check size={16} className="text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Guide Card */}
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
            {guide.name} — Setup Guide
          </p>
          <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-card">

            {/* Website */}
            {guide.website && (
              <div style={{ borderBottom: '1px solid var(--border-c)' }}>
                <div className="px-4 pt-3.5 pb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Website</span>
                </div>
                <div className="flex items-center gap-2 px-4 pb-3.5">
                  <span className="flex-1 text-[13px] font-medium text-primary truncate">{guide.website}</span>
                  <button onClick={() => window.open(guide.website, '_blank')}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors">
                    <ExternalLink size={16} />
                  </button>
                  <button onClick={handleCopyUrl}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors">
                    {copiedUrl ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Steps */}
            <div style={{ borderBottom: '1px solid var(--border-c)' }}>
              <div className="px-4 pt-3.5 pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Steps to Get API Key</span>
              </div>
              <div className="px-4 pb-3.5">
                <ol className="space-y-2">
                  {guide.steps.map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-[13px] text-muted-foreground leading-snug">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Key Format */}
            <div style={{ borderBottom: '1px solid var(--border-c)' }}>
              <div className="px-4 pt-3.5 pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Key Format</span>
              </div>
              <div className="px-4 pb-3.5">
                <span className="text-[13px] font-mono text-foreground">{guide.keyFormat}</span>
              </div>
            </div>

            {/* Free Tier */}
            <div style={{ borderBottom: '1px solid var(--border-c)' }}>
              <div className="px-4 pt-3.5 pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Free Tier</span>
              </div>
              <div className="px-4 pb-3.5">
                <span className="text-[13px] text-muted-foreground">{guide.freeTier}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="px-4 pt-3.5 pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Notes</span>
              </div>
              <div className="px-4 pb-3.5">
                <span className="text-[13px] text-muted-foreground">{guide.notes}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="px-4 py-3 rounded-xl text-[12px] text-muted-foreground leading-relaxed"
          style={{ background: 'hsl(var(--accent))', border: '1px solid hsl(var(--primary) / 0.15)' }}>
          <span className="font-semibold text-primary">Note:</span> Your API key is stored securely on-device
          and never sent to our servers. Each provider has its own usage limits and pricing.
        </div>

        {/* CTA */}
        <button onClick={() => navigate('/settings')}
          className="w-full h-12 rounded-xl text-[15px] font-semibold text-primary-foreground bg-primary transition-colors hover:bg-primary/90">
          Go to AI Settings →
        </button>
      </div>
    </div>
  );
};

export default GetAPIKeyScreen;
