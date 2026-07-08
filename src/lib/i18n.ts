/**
 * UI-string internationalization — CLAUDE.md §12. This module covers interface
 * chrome only; legal-content translation is a separate pipeline (§6.2) with its
 * own accuracy requirements. ckb is both the default and the fallback locale.
 */
import type { Locale } from './types.ts';
import { LOCALES, SOURCE_LOCALE } from './types.ts';
import { getStored, setStored } from './storage.ts';
import ckb from '../i18n/ckb.json';
import en from '../i18n/en.json';
import ar from '../i18n/ar.json';

export type MessageKey = keyof typeof ckb;

// Assigning en/ar here is the compile-time parity check: a key missing from
// either dictionary fails `npm run typecheck`.
const dictionaries: Record<Locale, Record<MessageKey, string>> = { ckb, en, ar };

export const LOCALE_NAMES: Record<Locale, string> = {
  ckb: 'کوردی',
  ar: 'العربية',
  en: 'English',
};

const RTL_LOCALES: ReadonlySet<Locale> = new Set(['ckb', 'ar']);

export function dirFor(locale: Locale): 'rtl' | 'ltr' {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}

let currentLocale: Locale = SOURCE_LOCALE;
const listeners = new Set<(locale: Locale) => void>();

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as string[]).includes(value);
}

export function getLocale(): Locale {
  return currentLocale;
}

function applyLocale(locale: Locale): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = dirFor(locale);
}

export function setLocale(locale: Locale): void {
  if (locale === currentLocale) return;
  currentLocale = locale;
  setStored('locale', locale);
  applyLocale(locale);
  for (const listener of listeners) listener(locale);
}

/** Subscribe to locale changes; returns an unsubscribe function. */
export function onLocaleChange(listener: (locale: Locale) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  let message = dictionaries[currentLocale][key] ?? dictionaries[SOURCE_LOCALE][key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      message = message.replaceAll(`{${name}}`, String(value));
    }
  }
  return message;
}

/** Restore the stored locale (the pre-paint bootstrap already set lang/dir). */
export function initLocale(): void {
  const stored = getStored<string>('locale');
  currentLocale = isLocale(stored) ? stored : SOURCE_LOCALE;
  applyLocale(currentLocale);
}
