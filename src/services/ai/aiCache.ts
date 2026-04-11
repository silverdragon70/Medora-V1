// ══════════════════════════════════════════════════════════════════════════════
// aiCache.ts — AI Response Caching (localStorage)
// ══════════════════════════════════════════════════════════════════════════════

import type { CacheEntry } from '@/types/ai.types';

const CACHE_PREFIX = 'ai_cache_';

const TTL_HOURS_BY_FEATURE: Record<string, number> = {
  casePearl:  24,
  groupPearl: 24,
  insights:    6,
};

const getTTL = (feature: string): number =>
  TTL_HOURS_BY_FEATURE[feature] ?? 24;

export const getCacheKey = (feature: string, identifier: string): string =>
  `${CACHE_PREFIX}${feature}_${identifier}`;

export const get = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const entry: CacheEntry<T> = JSON.parse(cached);
    if (new Date(entry.expiresAt) < new Date()) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.response;
  } catch { return null; }
};

export const set = <T>(key: string, response: T, metadata: Partial<CacheEntry<T>>): void => {
  try {
    const now = new Date();
    const ttlHours = getTTL(metadata.feature ?? '');
    const entry: CacheEntry<T> = {
      response,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString(),
      feature: metadata.feature ?? 'casePearl',
      ...metadata,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch { /* storage full — ignore */ }
};

export const clear = (key: string): void => {
  localStorage.removeItem(key);
};

export const clearAll = (): void => {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(CACHE_PREFIX)) localStorage.removeItem(key);
  });
};

export const clearByFeature = (feature: string): void => {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(`${CACHE_PREFIX}${feature}`)) localStorage.removeItem(key);
  });
};

export const aiCache = { get, set, clear, clearAll, clearByFeature, getCacheKey };
export default aiCache;
