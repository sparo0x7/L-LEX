import type { PenaltyTag } from '../../lib/types.ts';
import { getLocale, t } from '../../lib/i18n.ts';
import type { SearchResult } from '../../lib/search.ts';
import { escapeHtml, highlightMatches, makeSnippet } from '../../lib/search.ts';
import { lawLabel, penaltyLabel } from './Filters.ts';

function badgeClasses(tag: PenaltyTag): string {
  if (tag === 'death-penalty') return 'border-danger/40 bg-danger/10 text-danger';
  if (tag === 'life-imprisonment')
    return 'border-accent-gold/40 bg-accent-gold/10 text-accent-gold';
  return 'border-border bg-bg-subtle text-text-secondary';
}

function renderBadges(tags: PenaltyTag[]): string {
  return tags
    .map(
      (tag) =>
        `<span class="rounded-full border px-2 py-0.5 text-xs ${badgeClasses(tag)}">${penaltyLabel(tag)}</span>`,
    )
    .join('');
}

export interface ResultCardOptions {
  query: string;
  selected: boolean;
  expanded: boolean;
}

export function renderResultCard(result: SearchResult, options: ResultCardOptions): string {
  const { doc } = result;
  const { query, selected, expanded } = options;

  // Article content is always the Sorani source text (until the Phase 6
  // translation pipeline lands), so it keeps lang=ckb dir=rtl in every UI locale.
  const contentAttrs = 'lang="ckb" dir="rtl"';
  const snippetSource = doc.conditions || doc.penalties;
  const snippet = highlightMatches(makeSnippet(snippetSource, query), query);
  const sourceNote =
    getLocale() === 'ckb'
      ? ''
      : `<p class="text-xs italic text-text-secondary">${t('article.sourceNote')}</p>`;

  const expandedBlock = expanded
    ? `
      <div class="mt-3 space-y-3 border-t border-border pt-3" ${contentAttrs}>
        <div>
          <h4 class="mb-1 text-sm font-semibold text-accent">${t('article.conditions')}</h4>
          <p class="leading-8">${highlightMatches(doc.conditions, query)}</p>
        </div>
        <div>
          <h4 class="mb-1 text-sm font-semibold text-accent">${t('article.penalty')}</h4>
          <p class="leading-8">${highlightMatches(doc.penalties, query)}</p>
        </div>
        ${sourceNote}
      </div>`
    : '';

  return `
    <li
      id="result-${escapeHtml(doc.id)}"
      data-result-id="${escapeHtml(doc.id)}"
      class="rounded-xl border bg-surface p-4 transition-colors ${
        selected ? 'border-accent-gold ring-2 ring-accent-gold/40' : 'border-border'
      }"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-md bg-accent px-2 py-0.5 text-sm font-semibold text-bg" dir="ltr">
          ${t('article.number', { n: doc.n })}
        </span>
        <span class="text-xs text-text-secondary">${lawLabel(doc.lawId)}</span>
        <span class="ms-auto flex flex-wrap gap-1.5">${renderBadges(doc.tags)}</span>
      </div>
      <h3 class="mt-2 font-semibold leading-7" ${contentAttrs}>${highlightMatches(doc.title, query)}</h3>
      ${expanded ? '' : `<p class="mt-1 text-sm leading-7 text-text-secondary" ${contentAttrs}>${snippet}</p>`}
      ${expandedBlock}
      <button
        type="button"
        data-expand-toggle="${escapeHtml(doc.id)}"
        aria-expanded="${expanded}"
        class="mt-2 text-sm text-accent underline underline-offset-4 hover:text-accent-gold"
      >${expanded ? t('article.collapse') : t('article.expand')}</button>
    </li>`;
}
