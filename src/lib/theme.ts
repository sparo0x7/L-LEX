import { getStored, setStored } from './storage.ts';

export type ThemePreference = 'light' | 'dark' | 'system';
export const THEME_PREFERENCES: ThemePreference[] = ['light', 'dark', 'system'];

const darkQuery = matchMedia('(prefers-color-scheme: dark)');

export function getThemePreference(): ThemePreference {
  const stored = getStored<string>('theme');
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function resolve(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') return darkQuery.matches ? 'dark' : 'light';
  return preference;
}

function apply(preference: ThemePreference): void {
  document.documentElement.dataset.theme = resolve(preference);
}

export function setThemePreference(preference: ThemePreference): void {
  setStored('theme', preference);
  apply(preference);
}

/** Apply the stored preference and track OS changes while in 'system' mode. */
export function initTheme(): void {
  apply(getThemePreference());
  darkQuery.addEventListener('change', () => {
    if (getThemePreference() === 'system') apply('system');
  });
}
