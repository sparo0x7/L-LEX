import { getLocale, t } from '../lib/i18n.ts';
import { lawBySlug, loadData } from '../lib/data.ts';
import { navigate, routePath } from '../lib/router.ts';
import { escapeHtml } from '../lib/search.ts';
import { lawLabel } from '../components/search/Filters.ts';
import { mountNotFoundPage } from './notFound.ts';
import { renderLawSkeleton } from '../components/ui/Skeleton.ts';
import { showLoadError } from '../components/ui/ErrorState.ts';

export async function mountLawPage(container: HTMLElement, lawSlug: string): Promise<void> {
  container.innerHTML = renderLawSkeleton();
  try {
    const data = await loadData();
    if (!container.isConnected) return;
    const law = lawBySlug(lawSlug);
    const docs = law ? data.byLaw.get(law.id) : undefined;
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

    const safeSourceUrl =
      law.sourceUrl && /^https?:\/\//i.test(law.sourceUrl) ? law.sourceUrl : undefined;
    const sourceLine = safeSourceUrl
      ? `<a class="text-sm text-accent underline underline-offset-4" href="${escapeHtml(safeSourceUrl)}" rel="noopener noreferrer">${escapeHtml(safeSourceUrl)}</a>`
      : `<p class="text-sm text-text-secondary">${t('law.imported', { date: law.importedAt })} — ${t('law.verificationPending')}.</p>`;

    const tocCells = docs
      .map(
        (doc) => `
        <a
          data-link
          href="${routePath({ name: 'article', lawSlug: law.slug, articleNumber: doc.n }, locale)}"
          title="${escapeHtml(doc.title)}"
          class="card-lift flex h-10 items-center justify-center rounded-md bg-surface text-sm shadow-sm hover:text-accent"
          dir="ltr"
        >${doc.n}</a>`,
      )
      .join('');

    const minArticle = docs[0]?.n ?? 1;
    const maxArticle = docs[docs.length - 1]?.n ?? law.articleCount;

    container.innerHTML = `
    <nav aria-label="${t('nav.breadcrumbLabel')}" class="no-print pt-4 text-sm text-text-secondary">
      <a data-link href="${routePath({ name: 'home' }, locale)}" class="link-underline hover:text-text-primary">${t('nav.home')}</a>
      <span aria-hidden="true"> / </span>
      <span aria-current="page">${label}</span>
    </nav>
    <header class="mt-4 space-y-2 rounded-xl bg-surface p-5 shadow-md">
      <h1 class="text-2xl font-bold tracking-[-0.02em] text-accent">${label}</h1>
      ${secondaryCitation}
      <p class="text-sm text-text-secondary">${t('law.articleCount', { count: law.articleCount })}</p>
      ${
        law.totalArticleCount && law.totalArticleCount > law.articleCount
          ? `<p class="rounded-md border border-accent-gold/40 bg-accent-gold/10 px-3 py-2 text-sm text-accent-gold">${t(
              'law.completeness',
              { available: law.articleCount, total: law.totalArticleCount },
            )}</p>`
          : ''
      }
      ${sourceLine}
    </header>
    <section class="mt-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">${t('law.overviewTitle')}</h2>
        <form data-jump class="flex items-center gap-2">
          <label class="text-sm text-text-secondary" for="jump-input">${t('law.jumpLabel')}</label>
          <input id="jump-input" type="number" min="${minArticle}" max="${maxArticle}" required
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
      if (input && Number.isInteger(number) && docs.some((d) => d.n === number)) {
        navigate({ name: 'article', lawSlug: law.slug, articleNumber: number }, getLocale());
      } else {
        input?.reportValidity();
      }
    });
  } catch {
    if (container.isConnected) showLoadError(container);
  }
}
