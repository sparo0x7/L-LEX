import { getLocale, t } from '../lib/i18n.ts';
import { LAWS } from '../lib/data.ts';
import { routePath } from '../lib/router.ts';
import { escapeHtml } from '../lib/search.ts';
import { lawLabel } from '../components/search/Filters.ts';
import { REPORT_EMAIL } from '../components/layout/Footer.ts';

const CREATOR_FACEBOOK = 'https://www.facebook.com/las.mhamad.1';

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
          ${t('law.imported', { date: law.importedAt })} —
          ${t('law.verificationPending')}
        </p>
      
        ${
          law.totalArticleCount && law.totalArticleCount > law.articleCount
            ? `<p class="mt-1 text-sm font-medium text-accent-gold">${t('law.completeness', {
                available: law.articleCount,
                total: law.totalArticleCount,
              })}</p>`
            : ''
        }
      </li>`,
  ).join('');

  container.innerHTML = `
    <div class="mx-auto max-w-3xl space-y-10 py-10">
      <header class="space-y-4">
        <h1 class="text-3xl font-bold">${t('about.title')}</h1>
        <p class="text-lg leading-9 text-text-secondary">${t('about.body')}</p>
      </header>
        <div class="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <a class="link-underline hover:text-text-primary" href="${CREATOR_FACEBOOK}" rel="me" dir="ltr">Facebook — Las Khoshnaw</a>
          <a class="link-underline hover:text-text-primary"
            href="mailto:${REPORT_EMAIL}?subject=${encodeURIComponent('L-LEX')}">${t('about.contact')}</a>
        </div>

      <section class="grid gap-4 md:grid-cols-2">
        <div class="rounded-xl border border-border bg-surface p-5">
          <h2 class="text-lg font-semibold">${t('about.missionTitle')}</h2>
          <p class="mt-2 leading-8 text-text-secondary">${t('about.missionBody')}</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-5">
          <h2 class="text-lg font-semibold">${t('about.scopeTitle')}</h2>
          <p class="mt-2 leading-8 text-text-secondary">${t('about.scopeBody')}</p>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-xl font-semibold">${t('about.sources')}</h2>
        <ul class="grid gap-3 md:grid-cols-2">${sources}</ul>
      </section>

    </div>`;
}
