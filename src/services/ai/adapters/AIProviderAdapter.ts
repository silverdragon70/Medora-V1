// ══════════════════════════════════════════════════════════════════════════════
// AIProviderAdapter.ts — Provider Interface
// ══════════════════════════════════════════════════════════════════════════════

export interface AIProviderAdapter {
  readonly providerId: string;
  readonly defaultModel: string;
  readonly availableModels: string[];

  callAPI(prompt: string, apiKey: string, model?: string, signal?: AbortSignal): Promise<string>;
  testConnection(apiKey: string, model?: string): Promise<boolean>;
  getEndpoint(model: string, apiKey: string): string;
  getHeaders(apiKey: string): Record<string, string>;
  getRequestBody(prompt: string, model: string): any;
  parseResponse(response: any): string;
}
