import { getLocale, t } from '../lib/i18n.ts';
import { LAWS } from '../lib/data.ts';
import { routePath } from '../lib/router.ts';
import { escapeHtml } from '../lib/search.ts';
import { lawLabel } from '../components/search/Filters.ts';
import { REPORT_EMAIL } from '../components/layout/Footer.ts';

export function mountAboutPage(container: HTMLElement): void {
  document.title = `L-LEX — ${t('about.title')}`;
  const locale = getLocale();

  const sources = LAWS.map(
    (law) => `
      <li class="rounded-lg border border-border bg-surface p-4">
        <a data-link href="${routePath({ name: 'law', lawSlug: law.slug }, locale)}"
          class="font-semibold text-accent hover:underline">${lawLabel(law.id)}</a>
        <p class="mt-1 text-sm text-text-secondary" lang="ckb" dir="rtl">${escapeHtml(law.officialCitation.ckb ?? '')}</p>
        <p class="mt-1 text-sm text-text-secondary">
          ${t('law.articleCount', { count: law.articleCount })} ·
          ${t('law.imported', { date: law.lastVerified })} —
          ${t('law.verificationPending')}
        </p>
      </li>`,
  ).join('');

  container.innerHTML = `
    <div class="mx-auto max-w-2xl space-y-8 py-8">
      <header class="space-y-3">
        <h1 class="text-2xl font-bold">${t('about.title')}</h1>
        <p class="leading-8 text-text-secondary">${t('about.body')}</p>
      </header>
      <section class="space-y-3">
        <h2 class="text-lg font-semibold">${t('about.sources')}</h2>
        <ul class="space-y-3">${sources}</ul>
      </section>
      <section class="rounded-xl border border-accent-gold/40 bg-accent-gold/5 p-4">
        <p class="text-sm leading-7">${t('footer.disclaimer')}</p>
      </section>
      <footer class="space-y-1 text-sm text-text-secondary">
        <p>${t('about.creator')}</p>
        <a class="underline underline-offset-4 hover:text-text-primary"
          href="mailto:${REPORT_EMAIL}?subject=L-LEX"
        >${t('footer.reportError')}</a>
      </footer>
    </div>`;
}
