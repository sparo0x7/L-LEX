import type { ThemePreference } from '../../lib/theme.ts';
import { THEME_PREFERENCES, getThemePreference, setThemePreference } from '../../lib/theme.ts';
import type { MessageKey } from '../../lib/i18n.ts';
import { t } from '../../lib/i18n.ts';

const ICON_PATHS: Record<ThemePreference, string> = {
  light:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  dark: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
  system: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8m-4-4v4"/>',
};

const LABEL_KEYS: Record<ThemePreference, MessageKey> = {
  light: 'theme.light',
  dark: 'theme.dark',
  system: 'theme.system',
};

const ACTIVE_CLASSES = ['bg-surface', 'text-text-primary', 'shadow-sm'];
const INACTIVE_CLASSES = ['text-text-secondary'];

export function renderThemeToggle(): string {
  const current = getThemePreference();
  const buttons = THEME_PREFERENCES.map((preference) => {
    const active = preference === current;
    return `
      <button
        type="button"
        data-theme-preference="${preference}"
        aria-pressed="${active}"
        aria-label="${t('theme.label')}: ${t(LABEL_KEYS[preference])}"
        title="${t(LABEL_KEYS[preference])}"
        class="rounded-md p-1.5 transition-colors hover:text-text-primary ${
          active ? ACTIVE_CLASSES.join(' ') : INACTIVE_CLASSES.join(' ')
        }"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          ${ICON_PATHS[preference]}
        </svg>
      </button>`;
  }).join('');

  return `
    <div
      role="group"
      aria-label="${t('theme.label')}"
      data-theme-toggle
      class="flex items-center gap-1 rounded-lg border border-border bg-bg-subtle p-1"
    >${buttons}</div>`;
}

export function wireThemeToggle(root: ParentNode): void {
  const group = root.querySelector('[data-theme-toggle]');
  group?.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      'button[data-theme-preference]',
    );
    if (!button) return;
    setThemePreference(button.dataset.themePreference as ThemePreference);
    for (const candidate of group.querySelectorAll<HTMLButtonElement>(
      'button[data-theme-preference]',
    )) {
      const active = candidate === button;
      candidate.setAttribute('aria-pressed', String(active));
      candidate.classList.remove(...ACTIVE_CLASSES, ...INACTIVE_CLASSES);
      candidate.classList.add(...(active ? ACTIVE_CLASSES : INACTIVE_CLASSES));
    }
  });
}
