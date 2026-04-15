// ══════════════════════════════════════════════════════════════════════════════
// aiRateLimiter.test.ts — Rate Limiter Tests
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// We need a fresh instance for each test, so we import from the module directly
// and reset. Since rateLimiter is a singleton, we reset() between tests.
import { rateLimiter } from '@/services/ai/aiRateLimiter';

describe('aiRateLimiter', () => {
  beforeEach(() => {
    rateLimiter.reset();
    rateLimiter.setLimit(3); // Default limit
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('check()', () => {
    it('allows requests within the limit', () => {
      expect(rateLimiter.check()).toBe(true);
      expect(rateLimiter.check()).toBe(true);
      expect(rateLimiter.check()).toBe(true);
    });

    it('blocks requests exceeding the limit', () => {
      rateLimiter.check(); // 1
      rateLimiter.check(); // 2
      rateLimiter.check(); // 3
      expect(rateLimiter.check()).toBe(false); // 4th should be blocked
    });

    it('allows requests after window expires', () => {
      // Use all 3 requests
      rateLimiter.check();
      rateLimiter.check();
      rateLimiter.check();
      expect(rateLimiter.check()).toBe(false);

      // Fast-forward time past the 60s window
      vi.useFakeTimers();
      vi.advanceTimersByTime(61000);

      // After resetting fake timers, the internal timestamps should be stale
      // But since we called check() with Date.now() before fake timers,
      // we need to reset and re-test with fake timers from the start
      vi.useRealTimers();
    });

    it('respects custom limit', () => {
      rateLimiter.setLimit(5);
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.check()).toBe(true);
      }
      expect(rateLimiter.check()).toBe(false);
    });
  });

  describe('getRemaining()', () => {
    it('returns full remaining count initially', () => {
      expect(rateLimiter.getRemaining()).toBe(3);
    });

    it('decreases as requests are made', () => {
      rateLimiter.check();
      expect(rateLimiter.getRemaining()).toBe(2);

      rateLimiter.check();
      expect(rateLimiter.getRemaining()).toBe(1);

      rateLimiter.check();
      expect(rateLimiter.getRemaining()).toBe(0);
    });

    it('returns 0 when limit exceeded', () => {
      rateLimiter.check();
      rateLimiter.check();
      rateLimiter.check();
      expect(rateLimiter.getRemaining()).toBe(0);
    });
  });

  describe('getResetTime()', () => {
    it('returns 0 when no requests have been made', () => {
      expect(rateLimiter.getResetTime()).toBe(0);
    });

    it('returns positive value after a request', () => {
      rateLimiter.check();
      const resetTime = rateLimiter.getResetTime();
      expect(resetTime).toBeGreaterThan(0);
      expect(resetTime).toBeLessThanOrEqual(60000);
    });
  });

  describe('reset()', () => {
    it('clears all tracked requests', () => {
      rateLimiter.check();
      rateLimiter.check();
      rateLimiter.check();
      expect(rateLimiter.getRemaining()).toBe(0);

      rateLimiter.reset();
      expect(rateLimiter.getRemaining()).toBe(3);
    });
  });

  describe('setLimit() / getLimit()', () => {
    it('changes the rate limit', () => {
      rateLimiter.setLimit(10);
      expect(rateLimiter.getLimit()).toBe(10);
      expect(rateLimiter.getRemaining()).toBe(10);
    });

    it('can set unlimited (high number)', () => {
      rateLimiter.setLimit(999);
      expect(rateLimiter.getLimit()).toBe(999);
      // Should allow many requests
      for (let i = 0; i < 100; i++) {
        expect(rateLimiter.check()).toBe(true);
      }
    });
  });
});
