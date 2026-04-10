// ══════════════════════════════════════════════════════════════════════════════
// aiErrorHandler.ts — AI Error Handling
// ══════════════════════════════════════════════════════════════════════════════

import { AIError } from '@/types/ai.types';

export { AIError };

export const AI_ERRORS = {
  NO_API_KEY: new AIError(
    'API key not found', 'NO_API_KEY',
    'Please enter your API key in Settings'
  ),
  INVALID_API_KEY: new AIError(
    'Invalid API key', 'INVALID_API_KEY',
    'Invalid API key. Please check your key in Settings'
  ),
  RATE_LIMIT: new AIError(
    'Rate limit exceeded', 'RATE_LIMIT',
    'Too many requests. Please wait a moment'
  ),
  QUOTA_EXCEEDED: new AIError(
    'Quota exceeded', 'QUOTA_EXCEEDED',
    'Free quota exceeded. Try again tomorrow'
  ),
  NETWORK_ERROR: new AIError(
    'Network error', 'NETWORK_ERROR',
    'Network error. Please check your connection'
  ),
  TIMEOUT: new AIError(
    'Request timeout', 'TIMEOUT',
    'Request timed out. Please try again'
  ),
  INVALID_RESPONSE: new AIError(
    'Invalid JSON response', 'INVALID_RESPONSE',
    'Unable to parse AI response. Please try again'
  ),
  AI_DISABLED: new AIError(
    'AI features disabled', 'AI_DISABLED',
    'AI features are disabled. Enable them in Settings'
  ),
};

export const handleAIError = (error: unknown): AIError => {
  if (error instanceof AIError) return error;
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('API key not valid') || message.includes('API_KEY_INVALID') || message.includes('401'))
    return AI_ERRORS.INVALID_API_KEY;
  if (message.includes('quota') || message.includes('Quota exceeded') || message.includes('429'))
    return AI_ERRORS.QUOTA_EXCEEDED;
  if (message.includes('rate limit') || message.includes('Rate limit'))
    return AI_ERRORS.RATE_LIMIT;
  if (message.includes('fetch') || message.includes('NetworkError') || message.includes('Failed to fetch'))
    return AI_ERRORS.NETWORK_ERROR;
  if (message.includes('timeout') || message.includes('Timeout') || message.includes('AbortError'))
    return AI_ERRORS.TIMEOUT;
  if (message.includes('JSON') || message.includes('parse') || message.includes('SyntaxError'))
    return AI_ERRORS.INVALID_RESPONSE;

  return new AIError(message, 'UNKNOWN', 'Something went wrong. Please try again.');
};

export const getErrorMessage = (error: AIError): string => error.userMessage;
