import { t } from '../lib/i18n.ts';
import { getLocale } from '../lib/i18n.ts';
import { routePath } from '../lib/router.ts';

export function mountNotFoundPage(container: HTMLElement): void {
  document.title = `L-LEX — ${t('notFound.title')}`;
  container.innerHTML = `
    <div class="flex flex-col items-center gap-4 py-24 text-center">
      <img src="/favicon.svg" alt="" aria-hidden="true"
        class="w-24 rounded-2xl opacity-70 shadow-sm" width="910" height="768" />
      <h1 class="text-2xl font-bold tracking-[-0.02em]">${t('notFound.title')}</h1>
      <a data-link href="${routePath({ name: 'home' }, getLocale())}"
        class="link-underline text-accent hover:text-accent-gold"
      >${t('notFound.home')}</a>
    </div>`;
}
