/**
 * Home / search page — CLAUDE.md §10.
 *
 * State lives at module level so it survives the full shell re-render on
 * locale change, and every search state is mirrored into the URL query string
 * (?q=&law=&penalty=&sort=) so results are shareable and bookmarkable.
 */
import type { LawId, Locale, PenaltyTag } from '../lib/types.ts';
import { getLocale, t } from '../lib/i18n.ts';
import { navigate } from '../lib/router.ts';
import { getStringArray, setStored } from '../lib/storage.ts';
import type { LocaleContentFile, SearchEngine, SearchResult, SearchSort } from '../lib/search.ts';
import { createSearchEngine, escapeHtml, normalizeSearchText } from '../lib/search.ts';
import { renderSearchBar } from '../components/search/SearchBar.ts';
import { LAW_IDS, PENALTY_TAGS, renderFilters } from '../components/search/Filters.ts';
import { renderResultCard } from '../components/search/ResultCard.ts';
import {
  renderNoFilterResults,
  renderNoResults,
  renderStartHint,
} from '../components/search/EmptyState.ts';
import { renderListSkeleton } from '../components/ui/Skeleton.ts';
import { showLoadError } from '../components/ui/ErrorState.ts';
import { LAWS, lawSlugById, loadData, loadLocaleContent } from '../lib/data.ts';

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
let localeContent: { locale: Locale; file: LocaleContentFile | null } | undefined;
let localeContentPromise: Promise<void> | null = null;
let localeContentRequestId = 0;

function resetSelection(): void {
  selectedIndex = -1;
  expandedId = null;
}

function ensureEngine(): Promise<SearchEngine> {
  enginePromise ??= loadData()
    .then((data) => {
      engine = createSearchEngine(data.docs);
      return engine;
    })
    .catch((error: unknown) => {
      enginePromise = null; // allow retry instead of caching a permanent failure
      throw error;
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
  return getStringArray('recent-searches');
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

function hasActiveFilters(): boolean {
  return Boolean(state.law || state.penalty);
}

function runSearch(): SearchResult[] {
  if (!engine) return [];
  // §3: filters alone browse the corpus, article-number order (no relevance
  // score exists without a query).
  if (!state.q.trim()) {
    return hasActiveFilters() ? engine.browse({ law: state.law, penalty: state.penalty }) : [];
  }
  return engine.search(state.q, {
    law: state.law,
    penalty: state.penalty,
    sort: state.sort,
  });
}

function ensureLocaleContent(container: HTMLElement): boolean {
  const locale = getLocale();
  if (locale === 'ckb') {
    localeContent = { locale, file: null };
    return true;
  }
  if (localeContent?.locale === locale) return true;

  const requestId = ++localeContentRequestId;
  const promise: Promise<void> = loadLocaleContent(locale)
    .then((file) => {
      if (requestId === localeContentRequestId && getLocale() === locale) {
        localeContent = { locale, file };
      }
    })
    .catch(() => {
      if (requestId === localeContentRequestId && getLocale() === locale) {
        localeContent = { locale, file: null };
      }
    })
    .finally(() => {
      if (localeContentPromise === promise) localeContentPromise = null;
      if (container.isConnected) renderResultsArea(container);
    });
  localeContentPromise = promise;
  return false;
}

function renderResultsArea(container: HTMLElement): void {
  const resultsHost = container.querySelector<HTMLElement>('[data-results]');
  const statusHost = container.querySelector<HTMLElement>('[data-search-status]');
  if (!resultsHost || !statusHost) return;

  if (!state.q.trim() && !hasActiveFilters()) {
    lastResults = [];
    selectedIndex = -1;
    statusHost.textContent = '';
    const totalArticles = LAWS.reduce((sum, law) => sum + law.articleCount, 0);
    resultsHost.innerHTML = `<div class="space-y-4">${renderStartHint(totalArticles)}${renderRecentSearches()}</div>`;
    writeStateToUrl();
    return;
  }

  if (!engine) {
    statusHost.textContent = t('search.loading');
    resultsHost.innerHTML = renderListSkeleton();
    void ensureEngine()
      .then(() => renderResultsArea(container))
      .catch(() => {
        if (resultsHost.isConnected) {
          statusHost.textContent = '';
          showLoadError(resultsHost);
        }
      });
    return;
  }

  if (!ensureLocaleContent(container)) {
    statusHost.textContent = t('search.loading');
    resultsHost.innerHTML = renderListSkeleton();
    return;
  }

  lastResults = runSearch();
  if (selectedIndex >= lastResults.length) selectedIndex = lastResults.length - 1;
  statusHost.textContent = t('search.resultsCount', { count: lastResults.length });

  resultsHost.innerHTML =
    lastResults.length === 0
      ? state.q.trim()
        ? renderNoResults(state.q)
        : renderNoFilterResults()
      : `<ul class="space-y-3">${lastResults
          .map((result, index) => {
            const card = renderResultCard(result, {
              query: state.q,
              selected: index === selectedIndex,
              expanded: result.doc.id === expandedId,
              content:
                getLocale() === 'ckb'
                  ? null
                  : (localeContent?.file?.articles[result.doc.id] ?? null),
            });
            // Light stagger on the first few cards only — live-updating list.
            return index < 8
              ? card.replace(
                  '<li',
                  `<li style="animation-delay:${index * 30}ms;animation-duration:0.35s" data-stagger`,
                )
              : card;
          })
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
  localeContent = undefined;
  localeContentPromise = null;
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

  const commitQuery = (preserveSelection = false) => {
    const queryChanged = input.value !== state.q;
    state.q = input.value;
    if (!preserveSelection || queryChanged) resetSelection();
    clearButton.classList.toggle('hidden', !state.q);
  };

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      commitQuery();
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
      clearTimeout(debounceTimer);
      commitQuery(true);
      const results = engine ? runSearch() : [];
      const target = results[selectedIndex] ?? results[0];
      renderResultsArea(container);
      if (target) {
        addRecentSearch(state.q);
        navigate(
          {
            name: 'article',
            lawSlug: lawSlugById(target.doc.lawId) ?? target.doc.lawId,
            articleNumber: target.doc.n,
          },
          getLocale(),
        );
      }
    } else if (event.key === 'Escape' && state.q) {
      input.value = '';
      commitQuery();
      renderResultsArea(container);
    }
  });

  clearButton.addEventListener('click', () => {
    input.value = '';
    commitQuery();
    renderResultsArea(container);
    input.focus();
  });

  container.querySelector('[data-penalty-filter]')?.addEventListener('change', (event) => {
    commitQuery();
    const value = (event.target as HTMLSelectElement).value;
    state.penalty = isPenaltyTag(value) ? value : '';
    renderResultsArea(container);
  });

  container.querySelector('[data-sort]')?.addEventListener('change', (event) => {
    commitQuery();
    state.sort = (event.target as HTMLSelectElement).value === 'number' ? 'number' : 'relevance';
    renderResultsArea(container);
  });

  // Delegated clicks: law chips, expand toggles, recent-search chips.
  container.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    const lawChip = target.closest<HTMLButtonElement>('[data-law-filter]');
    if (lawChip) {
      commitQuery();
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
      resetSelection();
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
