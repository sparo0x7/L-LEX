/**
 * The single wrapper around localStorage — CLAUDE.md §16. Every personal-data
 * feature (theme, language, favorites, recent searches) goes through here so
 * "clear my local data" is provably complete. No other module may touch
 * localStorage directly (index.html's pre-paint bootstrap mirrors the same
 * `laws:` key format read-only).
 */

const PREFIX = 'laws:';

export const STORAGE_KEYS = ['theme', 'locale', 'favorites', 'recent-searches'] as const;
export type StorageKey = (typeof STORAGE_KEYS)[number];

export function getStored<T>(key: StorageKey): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function setStored(key: StorageKey, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable or full — feature degrades to per-pageview state */
  }
}

export function clearAllStored(): void {
  for (const key of STORAGE_KEYS) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* nothing to clear */
    }
  }
}
