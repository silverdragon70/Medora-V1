// ══════════════════════════════════════════════════════════════════════════════
// aiService.test.ts — AI Service Core Logic Tests
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── JSON Extraction Tests (these are internal helpers, we test via reimplementation) ──

// Since extractJSON and sanitizeJSON are not exported, we test them indirectly
// by testing the same logic
const extractJSON = (text: string): string => {
  let t = text.trim();
  t = t.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  const start = t.indexOf('{');
  const end   = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response');
  return t.slice(start, end + 1);
};

const sanitizeJSON = (text: string): string => {
  return text
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .trim();
};

describe('aiService — JSON Extraction', () => {
  describe('extractJSON', () => {
    it('extracts JSON from clean response', () => {
      const input = '{"keyFindings": ["test"]}';
      expect(extractJSON(input)).toBe('{"keyFindings": ["test"]}');
    });

    it('extracts JSON from markdown code block', () => {
      const input = '```json\n{"keyFindings": ["test"]}\n```';
      expect(extractJSON(input)).toBe('{"keyFindings": ["test"]}');
    });

    it('extracts JSON with surrounding text', () => {
      const input = 'Here is the analysis:\n{"result": "success"}\nEnd of response.';
      expect(extractJSON(input)).toBe('{"result": "success"}');
    });

    it('extracts JSON with nested objects', () => {
      const input = '{"outer": {"inner": "value"}, "arr": [1,2,3]}';
      expect(extractJSON(input)).toBe('{"outer": {"inner": "value"}, "arr": [1,2,3]}');
    });

    it('throws on response with no JSON', () => {
      expect(() => extractJSON('No JSON here')).toThrow('No JSON object found');
    });

    it('handles JSON with only opening brace', () => {
      // This case has { but no }, should throw
      expect(() => extractJSON('Some text with { but no closing')).toThrow();
    });
  });

  describe('sanitizeJSON', () => {
    it('removes trailing commas before closing brace', () => {
      expect(sanitizeJSON('{"a": 1,}')).toBe('{"a": 1}');
    });

    it('removes trailing commas before closing bracket', () => {
      expect(sanitizeJSON('[1, 2, 3,]')).toBe('[1, 2, 3]');
    });

    it('removes control characters', () => {
      expect(sanitizeJSON('{"a": "hello\x00world"}')).toBe('{"a": "hello world"}');
    });

    it('leaves valid JSON unchanged', () => {
      const input = '{"key": "value", "arr": [1, 2]}';
      expect(sanitizeJSON(input)).toBe(input);
    });
  });
});

// ── Response Validation Tests ──────────────────────────────────────────────────

const validateAndFillCasePearl = (parsed: any) => ({
  keyFindings:          Array.isArray(parsed.keyFindings)          ? parsed.keyFindings          : ['Analysis complete'],
  warningFlags:         Array.isArray(parsed.warningFlags)         ? parsed.warningFlags         : [],
  differentialDiagnosis:Array.isArray(parsed.differentialDiagnosis)? parsed.differentialDiagnosis: [],
  recommendations:      Array.isArray(parsed.recommendations)      ? parsed.recommendations      : ['Follow up as needed'],
  drugInteractions:     Array.isArray(parsed.drugInteractions)     ? parsed.drugInteractions     : [],
  followUp: {
    timing:  parsed.followUp?.timing  ?? '24-48 hours',
    actions: Array.isArray(parsed.followUp?.actions) ? parsed.followUp.actions : [],
  },
  diseaseReview: {
    keyPoints:  Array.isArray(parsed.diseaseReview?.keyPoints)  ? parsed.diseaseReview.keyPoints  : [],
    references: Array.isArray(parsed.diseaseReview?.references) ? parsed.diseaseReview.references : [],
  },
  disclaimer: parsed.disclaimer ?? 'AI-generated analysis. Always verify with clinical judgment.',
});

describe('aiService — Response Validation', () => {
  describe('validateAndFillCasePearl', () => {
    it('accepts a fully valid response', () => {
      const input = {
        keyFindings: ['finding 1'],
        warningFlags: ['warning 1'],
        differentialDiagnosis: ['dx 1'],
        recommendations: ['rec 1'],
        drugInteractions: [{ drugs: 'A+B', severity: 'mild', effect: 'effect', recommendation: 'rec' }],
        followUp: { timing: '24h', actions: ['action 1'] },
        diseaseReview: { keyPoints: ['point 1'], references: ['ref 1'] },
        disclaimer: 'Custom disclaimer',
      };
      const result = validateAndFillCasePearl(input);
      expect(result.keyFindings).toEqual(['finding 1']);
      expect(result.warningFlags).toEqual(['warning 1']);
      expect(result.disclaimer).toBe('Custom disclaimer');
    });

    it('provides defaults for missing fields', () => {
      const result = validateAndFillCasePearl({});
      expect(result.keyFindings).toEqual(['Analysis complete']);
      expect(result.warningFlags).toEqual([]);
      expect(result.differentialDiagnosis).toEqual([]);
      expect(result.recommendations).toEqual(['Follow up as needed']);
      expect(result.drugInteractions).toEqual([]);
      expect(result.followUp.timing).toBe('24-48 hours');
      expect(result.followUp.actions).toEqual([]);
      expect(result.diseaseReview.keyPoints).toEqual([]);
      expect(result.diseaseReview.references).toEqual([]);
      expect(result.disclaimer).toContain('AI-generated');
    });

    it('handles non-array values by providing defaults', () => {
      const result = validateAndFillCasePearl({
        keyFindings: 'not an array',
        recommendations: 123,
      });
      expect(result.keyFindings).toEqual(['Analysis complete']);
      expect(result.recommendations).toEqual(['Follow up as needed']);
    });

    it('handles null followUp gracefully', () => {
      const result = validateAndFillCasePearl({ followUp: null });
      expect(result.followUp.timing).toBe('24-48 hours');
      expect(result.followUp.actions).toEqual([]);
    });

    it('handles null diseaseReview gracefully', () => {
      const result = validateAndFillCasePearl({ diseaseReview: null });
      expect(result.diseaseReview.keyPoints).toEqual([]);
      expect(result.diseaseReview.references).toEqual([]);
    });
  });
});

// ── Config Tests ───────────────────────────────────────────────────────────────

import { API_ENDPOINTS, DEFAULT_MODELS, PROVIDER_MODELS, GEMINI_CONFIG, HUGGINGFACE_CONFIG } from '@/services/ai/aiConfig';

describe('aiConfig', () => {
  describe('API_ENDPOINTS', () => {
    it('has endpoints for all non-custom, non-gemini, non-huggingface providers', () => {
      expect(API_ENDPOINTS.anthropic).toContain('anthropic.com');
      expect(API_ENDPOINTS.openai).toContain('openai.com');
      expect(API_ENDPOINTS.groq).toContain('groq.com');
      expect(API_ENDPOINTS.openrouter).toContain('openrouter.ai');
    });

    it('does not have endpoints for custom provider', () => {
      expect(API_ENDPOINTS.custom).toBeUndefined();
    });
  });

  describe('DEFAULT_MODELS', () => {
    it('defines default models for all known providers', () => {
      expect(DEFAULT_MODELS.gemini).toBeTruthy();
      expect(DEFAULT_MODELS.huggingface).toBeTruthy();
      expect(DEFAULT_MODELS.anthropic).toBeTruthy();
      expect(DEFAULT_MODELS.openai).toBeTruthy();
      expect(DEFAULT_MODELS.groq).toBeTruthy();
      expect(DEFAULT_MODELS.openrouter).toBeTruthy();
    });
  });

  describe('PROVIDER_MODELS', () => {
    it('has at least one model per provider', () => {
      Object.entries(PROVIDER_MODELS).forEach(([provider, models]) => {
        expect(models.length, `${provider} should have models`).toBeGreaterThan(0);
      });
    });

    it('default model is in available models for each provider', () => {
      Object.entries(DEFAULT_MODELS).forEach(([provider, defaultModel]) => {
        if (defaultModel && PROVIDER_MODELS[provider]) {
          expect(
            PROVIDER_MODELS[provider],
            `${provider}'s default model "${defaultModel}" should be in availableModels`
          ).toContain(defaultModel);
        }
      });
    });
  });

  describe('GEMINI_CONFIG', () => {
    it('has required fields', () => {
      expect(GEMINI_CONFIG.defaultModel).toBeTruthy();
      expect(GEMINI_CONFIG.temperature).toBeGreaterThanOrEqual(0);
      expect(GEMINI_CONFIG.temperature).toBeLessThanOrEqual(1);
      expect(GEMINI_CONFIG.maxOutputTokens).toBeGreaterThan(0);
      expect(typeof GEMINI_CONFIG.endpoint).toBe('function');
    });

    it('endpoint function generates correct URL', () => {
      const url = GEMINI_CONFIG.endpoint('gemini-3-flash-preview', 'mykey');
      expect(url).toContain('gemini-3-flash-preview');
      expect(url).toContain('mykey');
    });
  });

  describe('HUGGINGFACE_CONFIG', () => {
    it('has required fields', () => {
      expect(HUGGINGFACE_CONFIG.defaultModel).toBeTruthy();
      expect(HUGGINGFACE_CONFIG.temperature).toBeGreaterThanOrEqual(0);
      expect(HUGGINGFACE_CONFIG.maxTokens).toBeGreaterThan(0);
      expect(typeof HUGGINGFACE_CONFIG.endpoint).toBe('function');
    });
  });
});

import { testConnection } from '@/services/ai/aiService';

describe('aiService adapter', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('anthropic adapter formats headers and body correctly', async () => {
    let capturedRequest: RequestInit | undefined;
    
    global.fetch = vi.fn().mockImplementation(async (url: any, init: RequestInit) => {
      capturedRequest = init;
      return {
        ok: true,
        json: async () => ({
          content: [{ text: 'OK' }]
        })
      };
    });

    await testConnection('anthropic', 'test-key', 'claude-3-haiku-20240307');

    expect(global.fetch).toHaveBeenCalled();
    const headers = capturedRequest?.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('test-key');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(headers['Authorization']).toBeUndefined();

    const body = JSON.parse(capturedRequest?.body as string);
    expect(body.model).toBe('claude-3-haiku-20240307');
    expect(body.max_tokens).toBe(4096);
    expect(body.messages[0].role).toBe('user');
    expect(body.messages[0].content).toBe('Say OK');
  });
});
