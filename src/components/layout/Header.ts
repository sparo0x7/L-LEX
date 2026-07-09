import { getLocale, t } from '../../lib/i18n.ts';
import type { Route } from '../../lib/router.ts';
import { routePath } from '../../lib/router.ts';
import { renderLanguageSwitcher, wireLanguageSwitcher } from './LanguageSwitcher.ts';
import { renderThemeToggle, wireThemeToggle } from './ThemeToggle.ts';

// The brand logo is the traced artwork in public/favicon.svg (baked colors,
// non-square) — rendered as a rounded app-icon mark, not an inline icon.
const BRAND_MARK = `
  <img src="/favicon.svg" alt="" aria-hidden="true"
    class="h-9 w-auto shrink-0 rounded-lg shadow-sm" />`;

export function renderHeader(activeRoute: Route['name']): string {
  const locale = getLocale();
  const navLink = (
    route: Route,
    labelKey: 'nav.home' | 'search.label' | 'nav.favorites' | 'nav.about',
  ) => {
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
        <a data-link href="${routePath({ name: 'landing' }, locale)}" class="flex items-center gap-3 font-semibold text-accent">
          ${BRAND_MARK}
          <span class="text-lg tracking-wide" dir="ltr">L-LEX</span>
          <span class="sr-only">${t('app.name')}</span>
        </a>
        <nav aria-label="${t('nav.home')}" class="flex items-center gap-1">
          ${navLink({ name: 'landing' }, 'nav.home')}
          ${navLink({ name: 'home' }, 'search.label')}
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
