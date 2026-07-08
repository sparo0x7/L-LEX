import { t } from '../lib/i18n.ts';
import { getLocale } from '../lib/i18n.ts';
import { routePath } from '../lib/router.ts';

export function mountNotFoundPage(container: HTMLElement): void {
  document.title = `L-LEX — ${t('notFound.title')}`;
  container.innerHTML = `
    <div class="flex flex-col items-center gap-4 py-24 text-center">
      <svg class="size-16 text-text-secondary" viewBox="0 0 64 64" fill="none" stroke="currentColor"
        stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="32" cy="13" r="3" />
        <path d="M32 16v30" />
        <path d="M22 52h20M32 46v6" />
        <path d="M12 20h40" />
        <path d="M12 20 5 34m7-14 7 14M5 34a7 7 0 0 0 14 0" />
        <path d="M52 20l-7 14m7-14 7 14m-14 0a7 7 0 0 0 14 0" />
      </svg>
      <h1 class="text-2xl font-bold">${t('notFound.title')}</h1>
      <a data-link href="${routePath({ name: 'home' }, getLocale())}"
        class="text-accent underline underline-offset-4 hover:text-accent-gold"
      >${t('notFound.home')}</a>
    </div>`;
}
