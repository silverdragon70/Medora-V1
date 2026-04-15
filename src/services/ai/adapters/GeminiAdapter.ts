import type { AIProviderAdapter } from './AIProviderAdapter';
import { GEMINI_CONFIG } from '../aiConfig';

export class GeminiAdapter implements AIProviderAdapter {
  readonly providerId = 'gemini';
  readonly defaultModel = 'gemini-3-flash-preview';
  readonly availableModels = [
    'gemini-3-flash-preview',
    'gemini-3.1-pro-preview',
    'gemini-2.0-flash',
  ];

  getEndpoint(model: string, apiKey: string): string {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  }

  getHeaders(_apiKey: string): Record<string, string> {
    return { 'Content-Type': 'application/json' };
  }

  getRequestBody(prompt: string, _model: string): any {
    return {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: GEMINI_CONFIG.temperature,
        maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
      },
    };
  }

  parseResponse(response: any): string {
    return response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  async callAPI(prompt: string, apiKey: string, model?: string, signal?: AbortSignal): Promise<string> {
    const m = model ?? this.defaultModel;
    const res = await fetch(this.getEndpoint(m, apiKey), {
      method: 'POST',
      headers: this.getHeaders(apiKey),
      body: JSON.stringify(this.getRequestBody(prompt, m)),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `Gemini API error: ${res.status}`);
    }
    return this.parseResponse(await res.json());
  }

  async testConnection(apiKey: string, model?: string): Promise<boolean> {
    try {
      const result = await this.callAPI('Say OK', apiKey, model ?? this.defaultModel);
      return result.length > 0;
    } catch { return false; }
  }
}
