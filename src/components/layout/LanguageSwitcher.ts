import type { Locale } from '../../lib/types.ts';
import { LOCALES } from '../../lib/types.ts';
import { LOCALE_NAMES, dirFor, getLocale, setLocale, t } from '../../lib/i18n.ts';

export function renderLanguageSwitcher(): string {
  const current = getLocale();
  const buttons = LOCALES.map((locale) => {
    const active = locale === current;
    return `
      <button
        type="button"
        data-locale="${locale}"
        lang="${locale}"
        dir="${dirFor(locale)}"
        aria-pressed="${active}"
        class="rounded-md px-3 py-1.5 text-sm transition-colors ${
          active
            ? 'bg-surface text-text-primary shadow-sm'
            : 'text-text-secondary hover:text-text-primary'
        }"
      >${LOCALE_NAMES[locale]}</button>`;
  }).join('');

  return `
    <div
      role="group"
      aria-label="${t('language.label')}"
      data-language-switcher
      class="flex items-center gap-1 rounded-lg border border-border bg-bg-subtle p-1"
    >${buttons}</div>`;
}

export function wireLanguageSwitcher(root: ParentNode): void {
  root.querySelector('[data-language-switcher]')?.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-locale]');
    if (button) setLocale(button.dataset.locale as Locale);
  });
}
