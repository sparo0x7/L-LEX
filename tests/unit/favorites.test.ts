import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getFavorites, isFavorite, toggleFavorite } from '../../src/lib/favorites.ts';

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };
}

describe('favorites', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('toggles articles on and off and prepends new favorites', () => {
    expect(toggleFavorite('law-1')).toBe(true);
    expect(toggleFavorite('law-2')).toBe(true);
    expect(getFavorites()).toEqual(['law-2', 'law-1']);
    expect(isFavorite('law-1')).toBe(true);

    expect(toggleFavorite('law-1')).toBe(false);
    expect(getFavorites()).toEqual(['law-2']);
    expect(isFavorite('law-1')).toBe(false);
  });

  it('treats corrupted storage as empty instead of throwing', () => {
    localStorage.setItem('laws:favorites', '{"not":"an array"}');
    expect(getFavorites()).toEqual([]);
    expect(isFavorite('law-1')).toBe(false);
    expect(toggleFavorite('law-1')).toBe(true);
    expect(getFavorites()).toEqual(['law-1']);
  });
});
