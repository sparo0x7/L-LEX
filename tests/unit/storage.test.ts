import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  STORAGE_KEYS,
  clearAllStored,
  getStored,
  getStringArray,
  setStored,
} from '../../src/lib/storage.ts';

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };
}

describe('localStorage wrapper', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips JSON values under the laws: prefix', () => {
    setStored('theme', 'dark');
    expect(localStorage.getItem('laws:theme')).toBe('"dark"');
    expect(getStored('theme')).toBe('dark');
  });

  it('returns null for corrupt JSON instead of throwing', () => {
    localStorage.setItem('laws:favorites', '{not json');
    expect(getStored('favorites')).toBeNull();
    expect(getStringArray('favorites')).toEqual([]);
  });

  it('filters non-string entries out of stored arrays', () => {
    localStorage.setItem('laws:recent-searches', JSON.stringify(['valid', 42, null, 'also-valid']));
    expect(getStringArray('recent-searches')).toEqual(['valid', 'also-valid']);
  });

  it('clearAllStored removes every declared key', () => {
    for (const key of STORAGE_KEYS) setStored(key, 'x');
    clearAllStored();
    for (const key of STORAGE_KEYS) expect(localStorage.getItem(`laws:${key}`)).toBeNull();
  });
});
