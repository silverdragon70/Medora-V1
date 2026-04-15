// ══════════════════════════════════════════════════════════════════════════════
// aiAdapters.test.ts — AI Provider Adapter Tests
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { GeminiAdapter } from '@/services/ai/adapters/GeminiAdapter';
import { HuggingFaceAdapter } from '@/services/ai/adapters/HuggingFaceAdapter';

describe('GeminiAdapter', () => {
  const adapter = new GeminiAdapter();

  it('has correct providerId', () => {
    expect(adapter.providerId).toBe('gemini');
  });

  it('has a default model', () => {
    expect(adapter.defaultModel).toBeTruthy();
    expect(adapter.defaultModel).toContain('gemini');
  });

  it('has available models', () => {
    expect(adapter.availableModels.length).toBeGreaterThan(0);
    expect(adapter.availableModels).toContain('gemini-3-flash-preview');
  });

  describe('getEndpoint', () => {
    it('returns Google API URL with model and key', () => {
      const url = adapter.getEndpoint('gemini-3-flash-preview', 'test-key-123');
      expect(url).toContain('generativelanguage.googleapis.com');
      expect(url).toContain('gemini-3-flash-preview');
      expect(url).toContain('test-key-123');
    });
  });

  describe('getHeaders', () => {
    it('returns Content-Type header', () => {
      const headers = adapter.getHeaders('any-key');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('does not include Authorization header (key is in URL)', () => {
      const headers = adapter.getHeaders('any-key');
      expect(headers['Authorization']).toBeUndefined();
    });
  });

  describe('getRequestBody', () => {
    it('structures body with contents array', () => {
      const body = adapter.getRequestBody('Hello', 'gemini-3-flash-preview');
      expect(body.contents).toBeDefined();
      expect(body.contents[0].parts[0].text).toBe('Hello');
    });

    it('includes generation config', () => {
      const body = adapter.getRequestBody('Hello', 'gemini-3-flash-preview');
      expect(body.generationConfig).toBeDefined();
      expect(body.generationConfig.temperature).toBeDefined();
      expect(body.generationConfig.maxOutputTokens).toBeDefined();
    });
  });

  describe('parseResponse', () => {
    it('extracts text from candidates', () => {
      const response = {
        candidates: [{ content: { parts: [{ text: 'Hello world' }] } }],
      };
      expect(adapter.parseResponse(response)).toBe('Hello world');
    });

    it('returns empty string for malformed response', () => {
      expect(adapter.parseResponse(null)).toBe('');
      expect(adapter.parseResponse({})).toBe('');
      expect(adapter.parseResponse({ candidates: [] })).toBe('');
    });
  });
});

describe('HuggingFaceAdapter', () => {
  const adapter = new HuggingFaceAdapter();

  it('has correct providerId', () => {
    expect(adapter.providerId).toBe('huggingface');
  });

  it('has a default model', () => {
    expect(adapter.defaultModel).toBeTruthy();
  });

  it('has available models', () => {
    expect(adapter.availableModels.length).toBeGreaterThan(0);
  });

  describe('getEndpoint', () => {
    it('returns HuggingFace inference URL with model', () => {
      const url = adapter.getEndpoint('meta-llama/Llama-3.1-70B-Instruct', 'key');
      expect(url).toContain('api-inference.huggingface.co');
      expect(url).toContain('meta-llama/Llama-3.1-70B-Instruct');
    });
  });

  describe('getHeaders', () => {
    it('includes Authorization bearer token', () => {
      const headers = adapter.getHeaders('hf_test_key');
      expect(headers['Authorization']).toBe('Bearer hf_test_key');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('getRequestBody', () => {
    it('structures body with inputs field', () => {
      const body = adapter.getRequestBody('Analyze this', 'model-x');
      expect(body.inputs).toBe('Analyze this');
    });

    it('includes parameters with temperature and max_new_tokens', () => {
      const body = adapter.getRequestBody('Test', 'model-x');
      expect(body.parameters).toBeDefined();
      expect(body.parameters.temperature).toBeDefined();
      expect(body.parameters.max_new_tokens).toBeDefined();
      expect(body.parameters.return_full_text).toBe(false);
    });
  });

  describe('parseResponse', () => {
    it('handles array response format', () => {
      const response = [{ generated_text: 'Result text' }];
      expect(adapter.parseResponse(response)).toBe('Result text');
    });

    it('handles object response format', () => {
      const response = { generated_text: 'Result text' };
      expect(adapter.parseResponse(response)).toBe('Result text');
    });

    it('handles text field fallback', () => {
      const response = { text: 'Fallback text' };
      expect(adapter.parseResponse(response)).toBe('Fallback text');
    });

    it('returns empty string for malformed response', () => {
      expect(adapter.parseResponse(null)).toBe('');
      expect(adapter.parseResponse({})).toBe('');
    });
  });
});
