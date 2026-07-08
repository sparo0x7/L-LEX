import { getLocale, t } from '../../lib/i18n.ts';
import type { Route } from '../../lib/router.ts';
import { routePath } from '../../lib/router.ts';
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

export function renderHeader(activeRoute: Route['name']): string {
  const locale = getLocale();
  const navLink = (route: Route, labelKey: 'nav.home' | 'nav.favorites' | 'nav.about') => {
    const active = activeRoute === route.name;
    return `
      <a data-link href="${routePath(route, locale)}"
        ${active ? 'aria-current="page"' : ''}
        class="rounded-md px-2.5 py-1.5 text-sm ${
          active
            ? 'font-semibold text-accent'
            : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
        }"
      >${t(labelKey)}</a>`;
  };

  return `
    <header class="no-print border-b border-border bg-surface">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3">
        <a data-link href="${routePath({ name: 'home' }, locale)}" class="flex items-center gap-3 font-semibold text-accent">
          ${BRAND_MARK}
          <span class="text-lg tracking-wide" dir="ltr">L-LEX</span>
          <span class="sr-only">${t('app.name')}</span>
        </a>
        <nav aria-label="${t('nav.home')}" class="flex items-center gap-1">
          ${navLink({ name: 'home' }, 'nav.home')}
          ${navLink({ name: 'favorites' }, 'nav.favorites')}
          ${navLink({ name: 'about' }, 'nav.about')}
        </nav>
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
