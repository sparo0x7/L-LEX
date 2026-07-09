/**
 * Landing page (§4) — the scales animation as a full hero (ambient loop, not
 * a one-time interstitial), value-prop stats, and a Get Started CTA into the
 * search app at /search. Respects prefers-reduced-motion throughout: static
 * mark, static numbers, no stagger.
 */
import { getLocale, t } from '../lib/i18n.ts';
import { LAWS } from '../lib/data.ts';
import { routePath } from '../lib/router.ts';

const COUNT_UP_MS = 1200;

const HERO_SCALES = `
  <svg class="size-36 text-accent sm:size-44" viewBox="0 0 64 64" fill="none"
    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true">
    <circle cx="32" cy="13" r="3" />
    <path d="M32 16v30" />
    <path d="M22 52h20M32 46v6" />
    <g class="hero-beam">
      <path d="M12 20h40" />
      <path d="M12 20 5 34m7-14 7 14M5 34a7 7 0 0 0 14 0" />
      <path d="M52 20l-7 14m7-14 7 14m-14 0a7 7 0 0 0 14 0" />
    </g>
  </svg>`;

function statCard(value: string, label: string, index: number, countTo?: number): string {
  return `
    <div
      class="stagger-item w-40 rounded-2xl bg-surface p-5 shadow-md"
      style="animation-delay: ${200 + index * 60}ms"
    >
      <p class="text-3xl font-bold tracking-[-0.02em] text-accent" dir="ltr"
        ${countTo === undefined ? '' : `data-count-up="${countTo}"`}>${value}</p>
      <p class="mt-1 text-sm text-text-secondary">${label}</p>
    </div>`;
}

export function mountLandingPage(container: HTMLElement): void {
  document.title = `L-LEX — ${t('app.name')}`;
  const locale = getLocale();
  const totalArticles = LAWS.reduce((sum, law) => sum + law.articleCount, 0);
  const searchHref = routePath({ name: 'home' }, locale);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  container.innerHTML = `
    <section class="relative flex min-h-[calc(100dvh-12rem)] flex-col items-center justify-center gap-8 py-12 text-center">
      <a
        data-link
        href="${searchHref}"
        class="link-underline absolute end-0 top-4 text-sm text-text-secondary hover:text-text-primary"
      >${t('landing.skipToSearch')} <span aria-hidden="true" class="inline-block rtl:rotate-180">→</span></a>

      <div class="stagger-item">${HERO_SCALES}</div>

      <h1 class="stagger-item max-w-2xl text-3xl font-bold leading-tight tracking-[-0.02em] text-accent sm:text-5xl"
        style="animation-delay: 120ms">${t('app.tagline')}</h1>

      <div class="flex flex-wrap items-stretch justify-center gap-4">
        ${statCard(reducedMotion ? String(totalArticles) : '0', t('landing.statsArticles'), 0, reducedMotion ? undefined : totalArticles)}
        ${statCard('3', t('landing.statsLanguages'), 1)}
        ${statCard('⚖', t('landing.statsNoLogin'), 2)}
      </div>

      <div class="stagger-item flex flex-col items-center gap-4" style="animation-delay: 420ms">
        <a
          data-link
          href="${searchHref}"
          class="rounded-xl bg-accent-gold px-8 py-3.5 text-lg font-semibold text-white shadow-md transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] dark:text-bg"
        >${t('landing.getStarted')}</a>
      </div>
    </section>`;

  // Count-up stat (skipped entirely under reduced motion — value renders static).
  const counter = container.querySelector<HTMLElement>('[data-count-up]');
  if (counter) {
    const target = Number(counter.dataset.countUp);
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / COUNT_UP_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      counter.textContent = String(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
