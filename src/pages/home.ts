/**
 * Home / search page — CLAUDE.md §10.
 *
 * State lives at module level so it survives the full shell re-render on
 * locale change, and every search state is mirrored into the URL query string
 * (?q=&law=&penalty=&sort=) so results are shareable and bookmarkable.
 */
import type { LawId, PenaltyTag } from '../lib/types.ts';
import { getLocale, t } from '../lib/i18n.ts';
import { navigate } from '../lib/router.ts';
import { getStored, setStored } from '../lib/storage.ts';
import type { SearchEngine, SearchIndexFile, SearchResult, SearchSort } from '../lib/search.ts';
import { createSearchEngine, escapeHtml, normalizeSearchText } from '../lib/search.ts';
import { renderSearchBar } from '../components/search/SearchBar.ts';
import { LAW_IDS, PENALTY_TAGS, renderFilters } from '../components/search/Filters.ts';
import { renderResultCard } from '../components/search/ResultCard.ts';
import { renderNoResults, renderStartHint } from '../components/search/EmptyState.ts';
import searchIndexUrl from '../../content/normalized/search-index.json?url';

const DEBOUNCE_MS = 200;
const MAX_RECENT = 8;

interface SearchPageState {
  q: string;
  law: LawId | '';
  penalty: PenaltyTag | '';
  sort: SearchSort;
}

const state: SearchPageState = { q: '', law: '', penalty: '', sort: 'relevance' };
let engine: SearchEngine | null = null;
let enginePromise: Promise<SearchEngine> | null = null;
let selectedIndex = -1;
let expandedId: string | null = null;
let lastResults: SearchResult[] = [];

function ensureEngine(): Promise<SearchEngine> {
  enginePromise ??= fetch(searchIndexUrl)
    .then((response) => response.json() as Promise<SearchIndexFile>)
    .then((file) => {
      engine = createSearchEngine(file.docs);
      return engine;
    });
  return enginePromise;
}

/* ---------- URL <-> state ---------- */

function isLawId(value: string): value is LawId {
  return (LAW_IDS as string[]).includes(value);
}

function isPenaltyTag(value: string): value is PenaltyTag {
  return (PENALTY_TAGS as string[]).includes(value);
}

function restoreStateFromUrl(): void {
  const params = new URLSearchParams(location.search);
  state.q = params.get('q') ?? '';
  const law = params.get('law') ?? '';
  state.law = isLawId(law) ? law : '';
  const penalty = params.get('penalty') ?? '';
  state.penalty = isPenaltyTag(penalty) ? penalty : '';
  state.sort = params.get('sort') === 'number' ? 'number' : 'relevance';
}

function writeStateToUrl(): void {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.law) params.set('law', state.law);
  if (state.penalty) params.set('penalty', state.penalty);
  if (state.sort !== 'relevance') params.set('sort', state.sort);
  const query = params.toString();
  history.replaceState(null, '', query ? `?${query}` : location.pathname);
}

/* ---------- recent searches ---------- */

function getRecentSearches(): string[] {
  return getStored<string[]>('recent-searches') ?? [];
}

function addRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  const normalized = normalizeSearchText(trimmed);
  const rest = getRecentSearches().filter((item) => normalizeSearchText(item) !== normalized);
  setStored('recent-searches', [trimmed, ...rest].slice(0, MAX_RECENT));
}

function renderRecentSearches(): string {
  const recent = getRecentSearches();
  if (recent.length === 0) return '';
  const chips = recent
    .map(
      (item) => `
        <button type="button" data-recent-query="${escapeHtml(item)}"
          class="rounded-full border border-border bg-surface px-3 py-1 text-sm text-text-secondary hover:text-text-primary"
        >${escapeHtml(item)}</button>`,
    )
    .join('');
  return `
    <div class="flex flex-wrap items-center justify-center gap-2">
      <span class="text-sm text-text-secondary">${t('search.recent')}:</span>
      ${chips}
      <button type="button" data-clear-recent
        class="text-sm text-text-secondary underline underline-offset-4 hover:text-text-primary"
      >${t('search.clearRecent')}</button>
    </div>`;
}

/* ---------- rendering ---------- */

function runSearch(): SearchResult[] {
  if (!engine || !state.q.trim()) return [];
  return engine.search(state.q, {
    law: state.law,
    penalty: state.penalty,
    sort: state.sort,
  });
}

function renderResultsArea(container: HTMLElement): void {
  const resultsHost = container.querySelector<HTMLElement>('[data-results]');
  const statusHost = container.querySelector<HTMLElement>('[data-search-status]');
  if (!resultsHost || !statusHost) return;

  if (!state.q.trim()) {
    lastResults = [];
    selectedIndex = -1;
    statusHost.textContent = '';
    resultsHost.innerHTML = `<div class="space-y-4">${renderStartHint()}${renderRecentSearches()}</div>`;
    writeStateToUrl();
    return;
  }

  if (!engine) {
    statusHost.textContent = t('search.loading');
    resultsHost.innerHTML = '';
    void ensureEngine().then(() => renderResultsArea(container));
    return;
  }

  lastResults = runSearch();
  if (selectedIndex >= lastResults.length) selectedIndex = lastResults.length - 1;
  statusHost.textContent = t('search.resultsCount', { count: lastResults.length });

  resultsHost.innerHTML =
    lastResults.length === 0
      ? renderNoResults(state.q)
      : `<ul class="space-y-3">${lastResults
          .map((result, index) =>
            renderResultCard(result, {
              query: state.q,
              selected: index === selectedIndex,
              expanded: result.doc.id === expandedId,
            }),
          )
          .join('')}</ul>`;
  writeStateToUrl();
}

function toggleExpanded(container: HTMLElement, id: string): void {
  expandedId = expandedId === id ? null : id;
  if (expandedId) addRecentSearch(state.q);
  renderResultsArea(container);
}

/* ---------- mount ---------- */

export function mountHomePage(container: HTMLElement): void {
  restoreStateFromUrl();
  void ensureEngine();

  container.innerHTML = `
    <section class="mx-auto w-full max-w-3xl space-y-5">
      <div class="space-y-2 pt-6 text-center">
        <h1 class="text-2xl font-bold text-accent sm:text-3xl">${t('app.tagline')}</h1>
      </div>
      ${renderSearchBar(state.q)}
      ${renderFilters(state)}
      <p data-search-status aria-live="polite" class="min-h-5 text-sm text-text-secondary"></p>
      <div data-results></div>
    </section>`;

  const input = container.querySelector<HTMLInputElement>('[data-search-input]');
  const clearButton = container.querySelector<HTMLButtonElement>('[data-search-clear]');
  if (!input || !clearButton) return;

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.q = input.value;
      selectedIndex = -1;
      expandedId = null;
      clearButton.classList.toggle('hidden', !state.q);
      renderResultsArea(container);
    }, DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (lastResults.length === 0) return;
      event.preventDefault();
      selectedIndex =
        event.key === 'ArrowDown'
          ? Math.min(selectedIndex + 1, lastResults.length - 1)
          : Math.max(selectedIndex - 1, -1);
      renderResultsArea(container);
      const selected = lastResults[selectedIndex];
      if (selected) {
        container
          .querySelector(`[data-result-id="${CSS.escape(selected.doc.id)}"]`)
          ?.scrollIntoView({ block: 'nearest' });
      }
    } else if (event.key === 'Enter') {
      const target = lastResults[selectedIndex] ?? lastResults[0];
      if (target) {
        addRecentSearch(state.q);
        navigate(
          { name: 'article', lawSlug: target.doc.lawId, articleNumber: target.doc.n },
          getLocale(),
        );
      }
    } else if (event.key === 'Escape' && state.q) {
      input.value = '';
      state.q = '';
      selectedIndex = -1;
      expandedId = null;
      clearButton.classList.add('hidden');
      renderResultsArea(container);
    }
  });

  clearButton.addEventListener('click', () => {
    input.value = '';
    state.q = '';
    selectedIndex = -1;
    expandedId = null;
    clearButton.classList.add('hidden');
    renderResultsArea(container);
    input.focus();
  });

  container.querySelector('[data-penalty-filter]')?.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value;
    state.penalty = isPenaltyTag(value) ? value : '';
    renderResultsArea(container);
  });

  container.querySelector('[data-sort]')?.addEventListener('change', (event) => {
    state.sort = (event.target as HTMLSelectElement).value === 'number' ? 'number' : 'relevance';
    renderResultsArea(container);
  });

  // Delegated clicks: law chips, expand toggles, recent-search chips.
  container.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    const lawChip = target.closest<HTMLButtonElement>('[data-law-filter]');
    if (lawChip) {
      const value = lawChip.dataset.lawFilter ?? '';
      state.law = isLawId(value) ? value : '';
      for (const chip of container.querySelectorAll<HTMLButtonElement>('[data-law-filter]')) {
        const active = (chip.dataset.lawFilter ?? '') === state.law;
        chip.setAttribute('aria-pressed', String(active));
        chip.className = `rounded-full border px-3 py-1.5 text-sm transition-colors ${
          active
            ? 'border-accent bg-accent text-bg'
            : 'border-border bg-surface text-text-secondary hover:text-text-primary'
        }`;
      }
      renderResultsArea(container);
      return;
    }

    const expandToggle = target.closest<HTMLButtonElement>('[data-expand-toggle]');
    if (expandToggle?.dataset.expandToggle) {
      toggleExpanded(container, expandToggle.dataset.expandToggle);
      return;
    }

    const recentChip = target.closest<HTMLButtonElement>('[data-recent-query]');
    if (recentChip?.dataset.recentQuery) {
      state.q = recentChip.dataset.recentQuery;
      input.value = state.q;
      clearButton.classList.remove('hidden');
      renderResultsArea(container);
      return;
    }

    if (target.closest('[data-clear-recent]')) {
      setStored('recent-searches', []);
      renderResultsArea(container);
    }
  });

  renderResultsArea(container);
}
