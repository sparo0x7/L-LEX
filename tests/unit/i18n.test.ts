import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dirFor, initLocale, t } from '../../src/lib/i18n.ts';

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };
}

describe('i18n runtime', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock());
    vi.stubGlobal('document', { documentElement: { lang: '', dir: '' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps Sorani and Arabic to RTL and English to LTR', () => {
    expect(dirFor('ckb')).toBe('rtl');
    expect(dirFor('ar')).toBe('rtl');
    expect(dirFor('en')).toBe('ltr');
  });

  it('falls back to Kurdish when storage is empty or invalid', () => {
    initLocale();
    expect(t('nav.home')).toBe('سەرەتا');
    expect(document.documentElement.lang).toBe('ckb');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('honors a valid stored locale and rejects invalid values', () => {
    localStorage.setItem('laws:locale', '"en"');
    initLocale();
    expect(t('nav.home')).toBe('Home');
    expect(document.documentElement.dir).toBe('ltr');

    localStorage.setItem('laws:locale', '"fr"');
    initLocale();
    expect(t('nav.home')).toBe('سەرەتا');
  });
});
