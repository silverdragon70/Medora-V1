// providersData.ts

export type ProviderTier = "free" | "paid" | "freemium" | "custom";

export interface ProviderGuide {
  name: string;
  tier: ProviderTier;
  website: string;
  steps: string[];
  keyFormat: string;
  freeTier: string;
  notes: string;
}

export const providerGuides: Record<string, ProviderGuide> = {
  gemini: {
    name: "Google Gemini",
    tier: "free",
    website: "https://aistudio.google.com",
    steps: [
      "Go to aistudio.google.com",
      "Sign in with your Google account",
      'Click "Get API Key" in the left sidebar',
      'Click "Create API Key"',
      'Copy the key (starts with "AIza...")',
    ],
    keyFormat: 'Starts with "AIza..."',
    freeTier: "50-100 requests per day. No credit card required.",
    notes: "Works immediately. Best for testing.",
  },
  huggingface: {
    name: "Hugging Face",
    tier: "free",
    website: "https://huggingface.co/settings/tokens",
    steps: [
      "Go to huggingface.co/settings/tokens",
      "Sign up / Sign in (free)",
      'Click "New token"',
      'Select "Read" or "Inference" permission',
      'Copy the token (starts with "hf_...")',
    ],
    keyFormat: 'Starts with "hf_..."',
    freeTier: "30,000 tokens per month on Inference API",
    notes: "Medical models available: Llama-3.1-70B, Mixtral-8x7B",
  },
  anthropic: {
    name: "Anthropic (Claude)",
    tier: "paid",
    website: "https://console.anthropic.com",
    steps: [
      "Go to console.anthropic.com",
      "Sign up / Sign in",
      "Go to API Keys section",
      'Click "Create Key"',
      'Copy the key (starts with "sk-ant-api03-...")',
    ],
    keyFormat: 'Starts with "sk-ant-api03-..."',
    freeTier: "$5 credit. Requires credit card.",
    notes: "Best for medical use cases. High accuracy.",
  },
  openai: {
    name: "OpenAI (GPT)",
    tier: "paid",
    website: "https://platform.openai.com",
    steps: [
      "Go to platform.openai.com",
      "Sign up / Sign in",
      "Go to API Keys",
      'Click "Create new secret key"',
      'Copy the key (starts with "sk-...")',
    ],
    keyFormat: 'Starts with "sk-..."',
    freeTier: "$5 credit. Requires credit card.",
    notes: "Credit expires after 3 months.",
  },
  groq: {
    name: "Groq",
    tier: "free",
    website: "https://console.groq.com",
    steps: [
      "Go to console.groq.com",
      "Sign up / Sign in",
      "Go to API Keys",
      'Click "Create API Key"',
      "Copy the key",
    ],
    keyFormat: 'Starts with "gsk_..."',
    freeTier: "1000 requests per day",
    notes: "Very fast. Great for testing.",
  },
  openrouter: {
    name: "OpenRouter",
    tier: "freemium",
    website: "https://openrouter.ai/keys",
    steps: [
      "Go to openrouter.ai/keys",
      "Sign up / Sign in",
      'Click "Create Key"',
      'Copy the key (starts with "sk-or-v1-...")',
    ],
    keyFormat: 'Starts with "sk-or-v1-..."',
    freeTier: "Some free models available",
    notes: "Access multiple models through one API.",
  },
  custom: {
    name: "Custom",
    tier: "custom",
    website: "",
    steps: [
      "Enter your custom endpoint URL",
      "Enter your API key",
      "Enter the model name",
    ],
    keyFormat: "User defined",
    freeTier: "Depends on your provider",
    notes: "For advanced users only.",
  },
};

export const providerKeys = Object.keys(providerGuides);

export const tierBadge: Record<ProviderTier, { label: string; className: string }> = {
  free:     { label: "Free",     className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  paid:     { label: "Paid",     className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  freemium: { label: "Freemium", className: "bg-primary/10 text-primary" },
  custom:   { label: "Custom",   className: "bg-muted text-muted-foreground" },
};