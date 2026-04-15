// ══════════════════════════════════════════════════════════════════════════════
// aiCache.test.ts — AI Cache Tests
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { aiCache, getCacheKey } from '@/services/ai/aiCache';

describe('aiCache', () => {
  beforeEach(() => {
    // Clear all AI cache entries before each test
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('ai_cache_')) localStorage.removeItem(key);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCacheKey', () => {
    it('generates correct cache key format', () => {
      expect(getCacheKey('casePearl', 'abc123')).toBe('ai_cache_casePearl_abc123');
      expect(getCacheKey('insights', 'today')).toBe('ai_cache_insights_today');
      expect(getCacheKey('groupPearl', 'hash')).toBe('ai_cache_groupPearl_hash');
    });
  });

  describe('set and get', () => {
    it('stores and retrieves a value', () => {
      const key = getCacheKey('casePearl', 'test1');
      const data = { keyFindings: ['finding 1'] };

      aiCache.set(key, data, { feature: 'casePearl', caseId: 'test1' });
      const result = aiCache.get<typeof data>(key);

      expect(result).toEqual(data);
    });

    it('returns null for non-existent key', () => {
      const result = aiCache.get('ai_cache_nonexistent');
      expect(result).toBeNull();
    });

    it('returns null for expired cache entries', () => {
      const key = getCacheKey('insights', 'expired');
      const data = { insights: [] };

      // Set cache entry with a short TTL by directly manipulating localStorage
      const entry = {
        response: data,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24h ago
        expiresAt: new Date(Date.now() - 1000).toISOString(), // expired 1 second ago
        feature: 'insights',
      };
      localStorage.setItem(key, JSON.stringify(entry));

      const result = aiCache.get(key);
      expect(result).toBeNull();
      // Should also remove the expired entry
      expect(localStorage.getItem(key)).toBeNull();
    });

    it('returns value for non-expired cache entries', () => {
      const key = getCacheKey('casePearl', 'valid');
      const data = { keyFindings: ['valid finding'] };

      const entry = {
        response: data,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // expires in 24h
        feature: 'casePearl',
      };
      localStorage.setItem(key, JSON.stringify(entry));

      const result = aiCache.get<typeof data>(key);
      expect(result).toEqual(data);
    });

    it('handles corrupted cache entries gracefully', () => {
      const key = getCacheKey('casePearl', 'corrupt');
      localStorage.setItem(key, '{{invalid json}}');
      const result = aiCache.get(key);
      expect(result).toBeNull();
    });
  });

  describe('clear', () => {
    it('removes a specific cache entry', () => {
      const key = getCacheKey('casePearl', 'to-clear');
      aiCache.set(key, { data: true }, { feature: 'casePearl' });
      expect(aiCache.get(key)).not.toBeNull();

      aiCache.clear(key);
      expect(aiCache.get(key)).toBeNull();
    });
  });

  describe('clearAll', () => {
    it('removes all AI cache entries', () => {
      aiCache.set(getCacheKey('casePearl', '1'), { a: 1 }, { feature: 'casePearl' });
      aiCache.set(getCacheKey('insights', '2'), { b: 2 }, { feature: 'insights' });
      aiCache.set(getCacheKey('groupPearl', '3'), { c: 3 }, { feature: 'groupPearl' });

      // Also set a non-AI entry that should NOT be removed
      localStorage.setItem('theme', 'dark');

      aiCache.clearAll();

      expect(aiCache.get(getCacheKey('casePearl', '1'))).toBeNull();
      expect(aiCache.get(getCacheKey('insights', '2'))).toBeNull();
      expect(aiCache.get(getCacheKey('groupPearl', '3'))).toBeNull();
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  describe('clearByFeature', () => {
    it('clears only entries for a specific feature', () => {
      aiCache.set(getCacheKey('casePearl', 'a'), { x: 1 }, { feature: 'casePearl' });
      aiCache.set(getCacheKey('casePearl', 'b'), { x: 2 }, { feature: 'casePearl' });
      aiCache.set(getCacheKey('insights', 'c'), { x: 3 }, { feature: 'insights' });

      aiCache.clearByFeature('casePearl');

      expect(aiCache.get(getCacheKey('casePearl', 'a'))).toBeNull();
      expect(aiCache.get(getCacheKey('casePearl', 'b'))).toBeNull();
      expect(aiCache.get(getCacheKey('insights', 'c'))).not.toBeNull();
    });
  });
});
