import { t } from '../../lib/i18n.ts';
import { escapeHtml } from '../../lib/search.ts';

const EMPTY_MARK = `<img src="/favicon.svg" alt="" aria-hidden="true"
  class="mx-auto mb-4 w-16 rounded-xl opacity-60 shadow-sm" width="910" height="768" />`;

export function renderNoResults(query: string): string {
  return `
    <div class="rounded-xl bg-bg-subtle px-6 py-10 text-center shadow-sm">
      ${EMPTY_MARK}
      <p class="text-lg font-semibold">${t('search.noResultsTitle', { query: escapeHtml(query) })}</p>
      <p class="mt-2 text-sm text-text-secondary">${t('search.noResultsHint')}</p>
    </div>`;
}

export function renderStartHint(totalArticles: number): string {
  return `<p class="text-center text-sm text-text-secondary">${t('search.startHint', { count: totalArticles })}</p>`;
}

/** A real empty result set from filter-only browsing (§3) — distinct from the start hint. */
export function renderNoFilterResults(): string {
  return `
    <div class="rounded-xl bg-bg-subtle px-6 py-10 text-center shadow-sm">
      ${EMPTY_MARK}
      <p class="text-lg font-semibold">${t('search.noFilterResults')}</p>
    </div>`;
}
