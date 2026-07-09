import { t } from '../../lib/i18n.ts';
import { escapeHtml } from '../../lib/search.ts';

export function renderNoResults(query: string): string {
  return `
    <div class="rounded-xl border border-border bg-bg-subtle px-6 py-10 text-center">
      <p class="text-lg font-semibold">${t('search.noResultsTitle', { query: escapeHtml(query) })}</p>
      <p class="mt-2 text-sm text-text-secondary">${t('search.noResultsHint')}</p>
    </div>`;
}

export function renderStartHint(): string {
  return `<p class="text-center text-sm text-text-secondary">${t('search.startHint')}</p>`;
}

/** A real empty result set from filter-only browsing (§3) — distinct from the start hint. */
export function renderNoFilterResults(): string {
  return `
    <div class="rounded-xl border border-border bg-bg-subtle px-6 py-10 text-center">
      <p class="text-lg font-semibold">${t('search.noFilterResults')}</p>
    </div>`;
}
