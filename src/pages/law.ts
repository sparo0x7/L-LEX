import type { LawId } from '../lib/types.ts';
import { getLocale, t } from '../lib/i18n.ts';
import { lawById, loadData } from '../lib/data.ts';
import { navigate, routePath } from '../lib/router.ts';
import { escapeHtml } from '../lib/search.ts';
import { lawLabel } from '../components/search/Filters.ts';
import { mountNotFoundPage } from './notFound.ts';

export async function mountLawPage(container: HTMLElement, lawSlug: string): Promise<void> {
  container.innerHTML = `<p class="py-16 text-center text-text-secondary">${t('search.loading')}</p>`;
  const data = await loadData();
  const law = lawById(lawSlug);
  const docs = data.byLaw.get(lawSlug as LawId);
  if (!law || !docs || docs.length === 0) {
    mountNotFoundPage(container);
    return;
  }

  const locale = getLocale();
  const label = lawLabel(law.id);
  document.title = `L-LEX — ${label}`;

  const secondaryCitation =
    locale !== 'ckb' && law.officialCitation.ckb
      ? `<p class="text-sm text-text-secondary" lang="ckb" dir="rtl">${escapeHtml(law.officialCitation.ckb)}</p>`
      : '';

  const sourceLine = law.sourceUrl
    ? `<a class="text-sm text-accent underline underline-offset-4" href="${escapeHtml(law.sourceUrl)}" rel="noopener">${escapeHtml(law.sourceUrl)}</a>`
    : `<p class="text-sm text-text-secondary">${t('law.imported', { date: law.lastVerified })} — ${t('law.verificationPending')}.</p>`;

  const tocCells = docs
    .map(
      (doc) => `
        <a
          data-link
          href="${routePath({ name: 'article', lawSlug: law.slug, articleNumber: doc.n }, locale)}"
          title="${escapeHtml(doc.title)}"
          class="flex h-10 items-center justify-center rounded-md border border-border bg-surface text-sm hover:border-accent hover:text-accent"
          dir="ltr"
        >${doc.n}</a>`,
    )
    .join('');

  container.innerHTML = `
    <nav aria-label="breadcrumb" class="no-print pt-4 text-sm text-text-secondary">
      <a data-link href="${routePath({ name: 'home' }, locale)}" class="hover:text-text-primary hover:underline">${t('nav.home')}</a>
      <span aria-hidden="true"> / </span>
      <span aria-current="page">${label}</span>
    </nav>
    <header class="mt-4 space-y-2 rounded-xl border border-border bg-surface p-5">
      <h1 class="text-2xl font-bold text-accent">${label}</h1>
      ${secondaryCitation}
      <p class="text-sm text-text-secondary">${t('law.articleCount', { count: law.articleCount })}</p>
      ${sourceLine}
    </header>
    <section class="mt-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">${t('law.overviewTitle')}</h2>
        <form data-jump class="flex items-center gap-2">
          <label class="text-sm text-text-secondary" for="jump-input">${t('law.jumpLabel')}</label>
          <input id="jump-input" type="number" min="1" max="${law.articleCount}" required
            class="w-24 rounded-md border border-border bg-surface px-2 py-1.5 text-sm" dir="ltr" />
          <button type="submit"
            class="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90"
          >${t('law.jumpGo')}</button>
        </form>
      </div>
      <div class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2">
        ${tocCells}
      </div>
    </section>`;

  container.querySelector<HTMLFormElement>('[data-jump]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = container.querySelector<HTMLInputElement>('#jump-input');
    const number = Number(input?.value);
    if (input && Number.isInteger(number) && number >= 1 && number <= law.articleCount) {
      navigate({ name: 'article', lawSlug: law.slug, articleNumber: number }, getLocale());
    } else {
      input?.reportValidity();
    }
  });
}
