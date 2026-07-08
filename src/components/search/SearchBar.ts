import { t } from '../../lib/i18n.ts';
import { escapeHtml } from '../../lib/search.ts';

/** Markup only — the home page controller owns state and event wiring. */
export function renderSearchBar(query: string): string {
  return `
    <div class="relative">
      <svg
        class="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-text-secondary"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        data-search-input
        type="search"
        enterkeyhint="search"
        autocomplete="off"
        spellcheck="false"
        role="searchbox"
        aria-label="${t('search.label')}"
        placeholder="${t('search.placeholder')}"
        value="${escapeHtml(query)}"
        class="w-full rounded-xl border border-border bg-surface py-3.5 ps-12 pe-12 text-lg shadow-sm placeholder:text-text-secondary focus:border-accent"
      />
      <button
        data-search-clear
        type="button"
        aria-label="${t('search.clear')}"
        class="absolute end-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary ${query ? '' : 'hidden'}"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </div>`;
}
