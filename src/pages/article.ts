import type { LawId } from '../lib/types.ts';
import { getLocale, t } from '../lib/i18n.ts';
import { lawById, loadData, loadTranslatedContent, relatedArticles } from '../lib/data.ts';
import { routePath } from '../lib/router.ts';
import type { SearchDoc } from '../lib/search.ts';
import { escapeHtml } from '../lib/search.ts';
import { isFavorite, toggleFavorite } from '../lib/favorites.ts';
import { lawLabel } from '../components/search/Filters.ts';
import { renderPenaltyBadges } from '../components/article/PenaltyBadges.ts';
import { mountNotFoundPage } from './notFound.ts';

const STAR_OUTLINE =
  '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function transientLabel(button: HTMLButtonElement, label: string): void {
  const original = button.textContent;
  button.textContent = label;
  setTimeout(() => {
    button.textContent = original;
  }, 1600);
}

function actionButton(attr: string, label: string, pressed?: boolean): string {
  const pressedAttr = pressed === undefined ? '' : `aria-pressed="${pressed}"`;
  return `
    <button type="button" ${attr} ${pressedAttr}
      class="rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-hover"
    >${label}</button>`;
}

function renderRelated(related: SearchDoc[], lawSlug: string): string {
  if (related.length === 0) return '';
  const cards = related
    .map(
      (doc) => `
        <a
          data-link
          href="${routePath({ name: 'article', lawSlug, articleNumber: doc.n }, getLocale())}"
          class="block rounded-lg border border-border bg-surface p-3 hover:border-accent"
        >
          <span class="text-sm font-semibold text-accent" dir="ltr">${t('article.number', { n: doc.n })}</span>
          <span class="mt-1 block truncate text-sm text-text-secondary" lang="ckb" dir="rtl">${escapeHtml(doc.title)}</span>
        </a>`,
    )
    .join('');
  return `
    <section class="no-print mt-8">
      <h2 class="mb-3 text-lg font-semibold">${t('article.related')}</h2>
      <div class="grid gap-3 sm:grid-cols-2">${cards}</div>
    </section>`;
}

export async function mountArticlePage(
  container: HTMLElement,
  lawSlug: string,
  articleNumber: number,
): Promise<void> {
  container.innerHTML = `<p class="py-16 text-center text-text-secondary">${t('search.loading')}</p>`;
  const data = await loadData();
  const law = lawById(lawSlug);
  const doc = data.byId.get(`${lawSlug}-${articleNumber}`);
  if (!law || !doc) {
    mountNotFoundPage(container);
    return;
  }

  const locale = getLocale();
  const label = lawLabel(law.id);
  document.title = `L-LEX — ${t('article.number', { n: doc.n })} · ${label}`;

  // Translation-state branching uses status, never content emptiness (§6.2):
  // 'machine' renders the translation with a "not yet reviewed" badge (§15);
  // 'missing' falls back to the Sorani source with a "not translated" badge.
  const translated = locale === 'ckb' ? null : await loadTranslatedContent(doc.id, locale);
  const status = translated?.status ?? doc.status[locale];
  const badgeHtml = (text: string) =>
    `<p class="rounded-md border border-accent-gold/40 bg-accent-gold/10 px-3 py-2 text-sm text-accent-gold">${text}</p>`;
  let translationBadge = '';
  if (locale !== 'ckb') {
    if (translated && status === 'machine')
      translationBadge = badgeHtml(t('article.machineTranslated'));
    else if (status !== 'reviewed') translationBadge = badgeHtml(t('article.notTranslated'));
  }
  const body = translated ?? doc; // translated fields, or Sorani source fallback
  const bodyAttrs = translated
    ? `lang="${locale}" dir="${locale === 'en' ? 'ltr' : 'rtl'}"`
    : 'lang="ckb" dir="rtl"';

  const citation = `${t('article.number', { n: doc.n })}, ${law.officialCitation[locale] ?? label}`;
  const lawDocs = data.byLaw.get(doc.lawId as LawId) ?? [];
  const previous = lawDocs.find((d) => d.n === doc.n - 1);
  const next = lawDocs.find((d) => d.n === doc.n + 1);
  const favorite = isFavorite(doc.id);

  const neighborLink = (target: SearchDoc | undefined, key: 'article.previous' | 'article.next') =>
    target
      ? `<a data-link href="${routePath({ name: 'article', lawSlug, articleNumber: target.n }, locale)}"
          class="text-sm text-accent underline underline-offset-4 hover:text-accent-gold"
        >${t(key)}</a>`
      : '<span></span>';

  container.innerHTML = `
    <nav aria-label="breadcrumb" class="no-print pt-4 text-sm text-text-secondary">
      <a data-link href="${routePath({ name: 'home' }, locale)}" class="hover:text-text-primary hover:underline">${t('nav.home')}</a>
      <span aria-hidden="true"> / </span>
      <a data-link href="${routePath({ name: 'law', lawSlug }, locale)}" class="hover:text-text-primary hover:underline">${label}</a>
      <span aria-hidden="true"> / </span>
      <span aria-current="page" dir="ltr">${t('article.number', { n: doc.n })}</span>
    </nav>

    <article class="mt-4">
      <header class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-md bg-accent px-2.5 py-1 font-semibold text-bg" dir="ltr">${t('article.number', { n: doc.n })}</span>
          <span class="text-sm text-text-secondary">${label}</span>
          <span class="ms-auto flex flex-wrap gap-1.5">${renderPenaltyBadges(doc.tags)}</span>
        </div>
        ${translationBadge}
        <h1 class="text-xl font-bold leading-9 sm:text-2xl" ${bodyAttrs}>${escapeHtml(body.title)}</h1>
        <div class="no-print flex flex-wrap items-center gap-2">
          <button type="button" data-favorite aria-pressed="${favorite}"
            class="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
              favorite
                ? 'border-accent-gold/60 bg-accent-gold/10 text-accent-gold'
                : 'border-border bg-surface hover:bg-surface-hover'
            }"
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="${favorite ? 'currentColor' : 'none'}"
              stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">${STAR_OUTLINE}</svg>
            <span>${favorite ? t('article.unfavorite') : t('article.favorite')}</span>
          </button>
          ${actionButton('data-copy-citation', t('article.copyCitation'))}
          ${actionButton('data-copy-link', t('article.copyLink'))}
          ${actionButton('data-print', t('article.print'))}
        </div>
      </header>

      <div class="mt-5 space-y-4">
        <section class="rounded-xl border border-border bg-surface p-5">
          <h2 class="mb-2 text-sm font-semibold text-accent">${t('article.conditions')}</h2>
          <p class="text-[17px] leading-9" ${bodyAttrs}>${escapeHtml(body.conditions)}</p>
        </section>
        <section class="rounded-xl border border-border bg-surface p-5">
          <h2 class="mb-2 text-sm font-semibold text-accent">${t('article.penalty')}</h2>
          <p class="text-[17px] leading-9" ${bodyAttrs}>${escapeHtml(body.penalties)}</p>
        </section>
      </div>

      <div class="no-print mt-5 flex items-center justify-between">
        ${neighborLink(previous, 'article.previous')}
        ${neighborLink(next, 'article.next')}
      </div>
    </article>

    ${renderRelated(relatedArticles(doc, lawDocs), lawSlug)}`;

  const favoriteButton = container.querySelector<HTMLButtonElement>('[data-favorite]');
  favoriteButton?.addEventListener('click', () => {
    const nowFavorite = toggleFavorite(doc.id);
    favoriteButton.setAttribute('aria-pressed', String(nowFavorite));
    favoriteButton.className = `flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
      nowFavorite
        ? 'border-accent-gold/60 bg-accent-gold/10 text-accent-gold'
        : 'border-border bg-surface hover:bg-surface-hover'
    }`;
    favoriteButton
      .querySelector('svg')
      ?.setAttribute('fill', nowFavorite ? 'currentColor' : 'none');
    const labelSpan = favoriteButton.querySelector('span:last-child');
    if (labelSpan)
      labelSpan.textContent = nowFavorite ? t('article.unfavorite') : t('article.favorite');
  });

  container
    .querySelector<HTMLButtonElement>('[data-copy-citation]')
    ?.addEventListener('click', async (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      if (await copyText(citation)) transientLabel(button, t('article.copied'));
    });

  container
    .querySelector<HTMLButtonElement>('[data-copy-link]')
    ?.addEventListener('click', async (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      if (await copyText(location.href)) transientLabel(button, t('article.copied'));
    });

  container.querySelector('[data-print]')?.addEventListener('click', () => window.print());
}
