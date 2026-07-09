import type { LawId } from '../lib/types.ts';
import { getLocale, t } from '../lib/i18n.ts';
import { loadData } from '../lib/data.ts';
import { routePath } from '../lib/router.ts';
import { escapeHtml } from '../lib/search.ts';
import { getFavorites, toggleFavorite } from '../lib/favorites.ts';
import { lawLabel } from '../components/search/Filters.ts';
import { renderPenaltyBadges } from '../components/article/PenaltyBadges.ts';
import { renderListSkeleton } from '../components/ui/Skeleton.ts';

export async function mountFavoritesPage(container: HTMLElement): Promise<void> {
  document.title = `L-LEX — ${t('favorites.title')}`;
  container.innerHTML = renderListSkeleton();
  const data = await loadData();

  const render = () => {
    const docs = getFavorites()
      .map((id) => data.byId.get(id))
      .filter((doc) => doc !== undefined);

    const body =
      docs.length === 0
        ? `<div class="rounded-xl bg-bg-subtle px-6 py-10 text-center shadow-sm">
             <img src="/favicon.svg" alt="" aria-hidden="true"
               class="mx-auto mb-4 w-16 rounded-xl opacity-60 shadow-sm" width="910" height="768" />
             <p class="text-text-secondary">${t('favorites.empty')}</p>
           </div>`
        : `<ul class="space-y-3">${docs
            .map((doc, index) => {
              const lawSlug = doc.lawId;
              const href = routePath(
                { name: 'article', lawSlug, articleNumber: doc.n },
                getLocale(),
              );
              return `
                <li class="card-lift stagger-item rounded-xl bg-surface p-4 shadow-sm"
                  style="animation-delay:${Math.min(index, 12) * 50}ms">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-md bg-accent px-2 py-0.5 text-sm font-semibold text-bg" dir="ltr">${t('article.number', { n: doc.n })}</span>
                    <span class="text-xs text-text-secondary">${lawLabel(doc.lawId as LawId)}</span>
                    <span class="ms-auto flex flex-wrap gap-1.5">${renderPenaltyBadges(doc.tags)}</span>
                    <button type="button" data-unfavorite="${escapeHtml(doc.id)}"
                      aria-label="${t('article.unfavorite')}"
                      class="rounded-md p-1.5 text-accent-gold hover:bg-surface-hover"
                    >
                      <svg class="size-4" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"
                        stroke-width="2" stroke-linejoin="round" aria-hidden="true">
                        <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>
                      </svg>
                    </button>
                  </div>
                  <a data-link href="${href}" class="mt-2 block font-semibold leading-7 hover:text-accent"
                    lang="ckb" dir="rtl">${escapeHtml(doc.title)}</a>
                </li>`;
            })
            .join('')}</ul>`;

    container.innerHTML = `
      <h1 class="pt-6 text-2xl font-bold tracking-[-0.02em]">${t('favorites.title')}</h1>
      <div class="mt-4">${body}</div>`;
  };

  container.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-unfavorite]');
    if (button?.dataset.unfavorite) {
      toggleFavorite(button.dataset.unfavorite);
      render();
    }
  });

  render();
}
