// ══════════════════════════════════════════════════════════════════════════════
// aiErrorHandler.test.ts — AI Error Handler Tests
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { handleAIError, getErrorMessage, AI_ERRORS, AIError } from '@/services/ai/aiErrorHandler';

describe('aiErrorHandler', () => {
  describe('AI_ERRORS constants', () => {
    it('defines all required error types', () => {
      expect(AI_ERRORS.NO_API_KEY).toBeInstanceOf(AIError);
      expect(AI_ERRORS.INVALID_API_KEY).toBeInstanceOf(AIError);
      expect(AI_ERRORS.RATE_LIMIT).toBeInstanceOf(AIError);
      expect(AI_ERRORS.QUOTA_EXCEEDED).toBeInstanceOf(AIError);
      expect(AI_ERRORS.NETWORK_ERROR).toBeInstanceOf(AIError);
      expect(AI_ERRORS.TIMEOUT).toBeInstanceOf(AIError);
      expect(AI_ERRORS.INVALID_RESPONSE).toBeInstanceOf(AIError);
      expect(AI_ERRORS.AI_DISABLED).toBeInstanceOf(AIError);
    });

    it('each error has code and userMessage', () => {
      Object.values(AI_ERRORS).forEach(error => {
        expect(error.code).toBeTruthy();
        expect(error.userMessage).toBeTruthy();
        expect(error.message).toBeTruthy();
      });
    });
  });

  describe('handleAIError', () => {
    it('returns AIError instances unchanged', () => {
      const err = AI_ERRORS.NO_API_KEY;
      expect(handleAIError(err)).toBe(err);
    });

    it('maps "API key not valid" to INVALID_API_KEY', () => {
      const result = handleAIError(new Error('API key not valid'));
      expect(result.code).toBe('INVALID_API_KEY');
    });

    it('maps API_KEY_INVALID to INVALID_API_KEY', () => {
      const result = handleAIError(new Error('API_KEY_INVALID'));
      expect(result.code).toBe('INVALID_API_KEY');
    });

    it('maps 401 status to INVALID_API_KEY', () => {
      const result = handleAIError(new Error('API error: 401'));
      expect(result.code).toBe('INVALID_API_KEY');
    });

    it('maps quota errors to QUOTA_EXCEEDED', () => {
      expect(handleAIError(new Error('quota exceeded')).code).toBe('QUOTA_EXCEEDED');
      expect(handleAIError(new Error('Quota exceeded')).code).toBe('QUOTA_EXCEEDED');
      expect(handleAIError(new Error('429 Too Many Requests')).code).toBe('QUOTA_EXCEEDED');
    });

    it('maps rate limit errors to RATE_LIMIT', () => {
      expect(handleAIError(new Error('rate limit exceeded')).code).toBe('RATE_LIMIT');
      expect(handleAIError(new Error('Rate limit')).code).toBe('RATE_LIMIT');
    });

    it('maps network errors to NETWORK_ERROR', () => {
      expect(handleAIError(new Error('Failed to fetch')).code).toBe('NETWORK_ERROR');
      expect(handleAIError(new Error('NetworkError')).code).toBe('NETWORK_ERROR');
      expect(handleAIError(new TypeError('fetch failed')).code).toBe('NETWORK_ERROR');
    });

    it('maps timeout errors to TIMEOUT', () => {
      expect(handleAIError(new Error('timeout')).code).toBe('TIMEOUT');
      expect(handleAIError(new Error('AbortError')).code).toBe('TIMEOUT');
      expect(handleAIError(new Error('Request Timeout')).code).toBe('TIMEOUT');
    });

    it('maps JSON parse errors to INVALID_RESPONSE', () => {
      expect(handleAIError(new Error('Unexpected token in JSON')).code).toBe('INVALID_RESPONSE');
      expect(handleAIError(new Error('parse error')).code).toBe('INVALID_RESPONSE');
      expect(handleAIError(new Error('SyntaxError: Unexpected')).code).toBe('INVALID_RESPONSE');
    });

    it('handles non-Error objects gracefully', () => {
      const result = handleAIError('string error');
      expect(result).toBeInstanceOf(AIError);
      expect(result.code).toBe('UNKNOWN');
    });

    it('handles unknown errors as UNKNOWN', () => {
      const result = handleAIError(new Error('some random error'));
      expect(result.code).toBe('UNKNOWN');
      expect(result.userMessage).toBeTruthy();
    });
  });

  describe('getErrorMessage', () => {
    it('returns the user-facing message', () => {
      const msg = getErrorMessage(AI_ERRORS.NO_API_KEY);
      expect(msg).toBe('Please enter your API key in Settings');
    });

    it('returns user message for all error types', () => {
      Object.values(AI_ERRORS).forEach(error => {
        const msg = getErrorMessage(error);
        expect(msg).toBeTruthy();
        expect(typeof msg).toBe('string');
      });
    });
  });

  describe('AIError class', () => {
    it('extends Error', () => {
      const err = new AIError('test', 'TEST_CODE', 'User message');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AIError);
    });

    it('stores code and userMessage', () => {
      const err = new AIError('internal msg', 'MY_CODE', 'Friendly message');
      expect(err.message).toBe('internal msg');
      expect(err.code).toBe('MY_CODE');
      expect(err.userMessage).toBe('Friendly message');
      expect(err.name).toBe('AIError');
    });
  });
});
