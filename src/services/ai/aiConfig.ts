export const GEMINI_CONFIG = {
  defaultModel: 'gemini-1.5-flash-latest',
  temperature: 0.1,
  maxOutputTokens: 8192,
  endpoint: (model: string, apiKey: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
};

export const HUGGINGFACE_CONFIG = {
  defaultModel: 'meta-llama/Llama-3.1-70B-Instruct',
  temperature: 0.1,
  maxTokens: 4096,
  endpoint: (model: string) =>
    `https://api-inference.huggingface.co/models/${model}`,
};

export const PROVIDER_MODELS: Record<string, string[]> = {
  gemini: [
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-2.0-flash',
  ],
  huggingface: [
    'meta-llama/Llama-3.1-70B-Instruct',
    'mistralai/Mixtral-8x7B-Instruct-v0.1',
    'Qwen/Qwen2.5-72B-Instruct',
    'google/gemma-2-27b-it',
  ],
  anthropic: [
    'claude-3-haiku-20240307',
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
  ],
  openai: [
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-4-turbo-preview',
  ],
  groq: [
    'mixtral-8x7b-32768',
    'llama-3.1-70b-versatile',
  ],
  openrouter: [
    'meta-llama/llama-3.1-8b-instruct:free',
    'anthropic/claude-3.5-sonnet',
  ],
  custom: ['user-defined'],
};

export const DEFAULT_MODELS: Record<string, string> = {
  gemini:      'gemini-1.5-flash-latest',
  huggingface: 'meta-llama/Llama-3.1-70B-Instruct',
  anthropic:   'claude-3-haiku-20240307',
  openai:      'gpt-4o-mini',
  groq:        'mixtral-8x7b-32768',
  openrouter:  'meta-llama/llama-3.1-8b-instruct:free',
  custom:      '',
};

export const API_ENDPOINTS: Record<string, string> = {
  anthropic:  'https://api.anthropic.com/v1/messages',
  openai:     'https://api.openai.com/v1/chat/completions',
  groq:       'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};
