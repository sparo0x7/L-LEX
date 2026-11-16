import type { LawId } from '../../lib/types.ts';
import { getLocale, t } from '../../lib/i18n.ts';
import type { SearchResult } from '../../lib/search.ts';
import { escapeHtml, highlightMatches, makeSnippet } from '../../lib/search.ts';
import { routePath } from '../../lib/router.ts';
import { lawLabel } from './Filters.ts';
import { lawSlugById } from '../../lib/data.ts';
import { renderPenaltyBadges } from '../article/PenaltyBadges.ts';

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
  const articleHref = routePath(
    {
      name: 'article',
      lawSlug: lawSlugById(doc.lawId) ?? doc.lawId,
      articleNumber: doc.n,
    },
    getLocale(),
  );
  const sourceNote =
    getLocale() === 'ckb'
      ? ''
      : `<p class="text-xs italic text-text-secondary">${t('article.sourceNote')}</p>`;

  const expandedBlock = expanded
    ? `
      <div class="mt-3 space-y-3 border-t border-border pt-3" ${contentAttrs}>
        <div>
          <h4 class="mb-1 text-sm font-semibold text-accent">${doc.penalties ? t('article.conditions') : t('article.text')}</h4>
          <p class="leading-8">${highlightMatches(doc.conditions, query)}</p>
        </div>
        ${
          doc.penalties
            ? `<div>
          <h4 class="mb-1 text-sm font-semibold text-accent">${t('article.penalty')}</h4>
          <p class="leading-8">${highlightMatches(doc.penalties, query)}</p>
        </div>`
            : ''
        }
        ${sourceNote}
      </div>`
    : '';

  return `
    <li
      id="result-${escapeHtml(doc.id)}"
      data-result-id="${escapeHtml(doc.id)}"
      class="card-lift rounded-xl bg-surface p-4 shadow-sm ${
        selected ? 'shadow-lg ring-2 ring-accent-gold/60' : ''
      }"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-md bg-accent px-2 py-0.5 text-sm font-semibold text-bg">
          ${t('article.number', { n: doc.n })}
        </span>
        <span class="text-xs text-text-secondary">${lawLabel(doc.lawId as LawId)}</span>
        <span class="ms-auto flex flex-wrap gap-1.5">${renderPenaltyBadges(doc.tags)}</span>
      </div>
      <h3 class="mt-2 font-semibold leading-7" ${contentAttrs}>
        <a data-link href="${articleHref}" class="hover:text-accent">${highlightMatches(doc.title, query)}</a>
      </h3>
      ${expanded ? '' : `<p class="mt-1 text-sm leading-7 text-text-secondary" ${contentAttrs}>${snippet}</p>`}
      ${expandedBlock}
      <button
        type="button"
        data-expand-toggle="${escapeHtml(doc.id)}"
        aria-expanded="${expanded}"
        class="link-underline mt-2 text-sm text-accent hover:text-accent-gold"
      >${expanded ? t('article.collapse') : t('article.expand')}</button>
    </li>`;
}
