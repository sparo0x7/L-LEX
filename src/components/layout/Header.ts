import { t } from '../../lib/i18n.ts';
import { renderLanguageSwitcher, wireLanguageSwitcher } from './LanguageSwitcher.ts';
import { renderThemeToggle, wireThemeToggle } from './ThemeToggle.ts';

const BRAND_MARK = `
  <svg class="size-8 shrink-0" viewBox="0 0 64 64" fill="none" stroke="currentColor"
    stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="32" cy="13" r="3" />
    <path d="M32 16v30" />
    <path d="M22 52h20M32 46v6" />
    <path d="M12 20h40" />
    <path d="M12 20 5 34m7-14 7 14M5 34a7 7 0 0 0 14 0" />
    <path d="M52 20l-7 14m7-14 7 14m-14 0a7 7 0 0 0 14 0" />
  </svg>`;

export function renderHeader(): string {
  return `
    <header class="border-b border-border bg-surface">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3">
        <a href="/" class="flex items-center gap-3 font-semibold text-accent">
          ${BRAND_MARK}
          <span class="text-lg">${t('app.name')}</span>
        </a>
        <div class="flex flex-wrap items-center justify-end gap-2">
          ${renderLanguageSwitcher()}
          ${renderThemeToggle()}
        </div>
      </div>
    </header>`;
}

export function wireHeader(root: ParentNode): void {
  wireLanguageSwitcher(root);
  wireThemeToggle(root);
}
