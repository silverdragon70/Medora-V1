// ══════════════════════════════════════════════════════════════════════════════
// HuggingFaceAdapter.ts — Hugging Face Inference API Adapter
// ══════════════════════════════════════════════════════════════════════════════

import type { AIProviderAdapter } from './AIProviderAdapter';
import { HUGGINGFACE_CONFIG, PROVIDER_MODELS } from '../aiConfig';

export class HuggingFaceAdapter implements AIProviderAdapter {
  readonly providerId = 'huggingface';
  readonly defaultModel = HUGGINGFACE_CONFIG.defaultModel;
  readonly availableModels = PROVIDER_MODELS['huggingface'];

  getEndpoint(model: string, _apiKey: string): string {
    return HUGGINGFACE_CONFIG.endpoint(model);
  }

  getHeaders(apiKey: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  getRequestBody(prompt: string, _model: string): any {
    return {
      inputs: prompt,
      parameters: {
        temperature: HUGGINGFACE_CONFIG.temperature,
        max_new_tokens: HUGGINGFACE_CONFIG.maxTokens,
        return_full_text: false,
      },
    };
  }

  parseResponse(response: any): string {
    if (Array.isArray(response)) return response[0]?.generated_text ?? '';
    return response?.generated_text ?? response?.text ?? '';
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
      throw new Error(err?.error ?? `HuggingFace API error: ${res.status}`);
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
