/**
 * Landing page (§4) — "Trust & Authority" / minimal single-column treatment
 * (ui-ux-pro-max recommendation for legal services), adapted to L-LEX's real
 * content: laws showcase instead of practice areas, live corpus stats instead
 * of case results, search/About/report-error instead of consultation booking.
 * No invented attorneys, cases, or testimonials — ever.
 *
 * Motion: hero ambient loop, count-up stats, IntersectionObserver scroll
 * reveals with staggered children. All of it collapses to static content
 * under prefers-reduced-motion.
 */
import type { LawId, PenaltyTag } from '../lib/types.ts';
import { getLocale, t } from '../lib/i18n.ts';
import { LAWS } from '../lib/data.ts';
import { routePath } from '../lib/router.ts';
import { escapeHtml } from '../lib/search.ts';
import { LAW_IDS, PENALTY_TAGS, lawLabel, penaltyLabel } from '../components/search/Filters.ts';
import { REPORT_EMAIL } from '../components/layout/Footer.ts';

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

// Lucide-style inline icons (skill checklist: SVG icons, never emoji).
const icon = (paths: string) => `
  <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICON_GLOBE = icon(
  '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
);
const ICON_BOLT = icon('<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>');
const ICON_SHIELD = icon('<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3z"/>');
const ICON_BOOK = icon(
  '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
);
const ICON_ARROW = `<span aria-hidden="true" class="inline-block transition-transform duration-300 ease-premium group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5">→</span>`;

function heading(text: string): string {
  return `
    <h2 class="text-2xl font-bold tracking-[-0.02em]">
      <span class="grow-bar mb-3 block h-1 w-12 rounded-full bg-accent-gold"></span>
      ${text}
    </h2>`;
}

function statCard(countTo: number, label: string, index: number): string {
  return `
    <div class="stagger-item w-40 rounded-2xl bg-surface p-5 shadow-md"
      style="animation-delay: ${240 + index * 60}ms">
      <p class="text-3xl font-bold tracking-[-0.02em] text-accent" dir="ltr" data-count-up="${countTo}">0</p>
      <p class="mt-1 text-sm text-text-secondary">${label}</p>
    </div>`;
}

function lawCard(lawId: LawId, index: number): string {
  const law = LAWS.find((entry) => entry.id === lawId);
  if (!law) return '';
  const completeness =
    law.totalArticleCount && law.totalArticleCount > law.articleCount
      ? `<span class="rounded-full border border-accent-gold/40 bg-accent-gold/10 px-2.5 py-0.5 text-xs text-accent-gold">${t(
          'law.completeness',
          { available: law.articleCount, total: law.totalArticleCount },
        )}</span>`
      : `<span class="rounded-full border border-border bg-bg-subtle px-2.5 py-0.5 text-xs text-text-secondary">${t(
          'law.articleCount',
          { count: law.articleCount },
        )}</span>`;
  return `
    <a data-link href="${routePath({ name: 'law', lawSlug: law.slug }, getLocale())}"
      data-reveal data-reveal-delay="${index * 80}ms"
      class="group block rounded-2xl bg-surface p-6 shadow-sm transition-all duration-300 ease-premium hover:-translate-y-1 hover:shadow-lg">
      <div class="flex items-start justify-between gap-3">
        <span class="text-accent">${ICON_BOOK}</span>
        ${completeness}
      </div>
      <h3 class="mt-4 text-lg font-semibold leading-7 group-hover:text-accent">${lawLabel(law.id)}</h3>
      <p class="mt-1 text-sm text-text-secondary" lang="ckb" dir="rtl">${escapeHtml(law.officialCitation.ckb ?? '')}</p>
      <p class="mt-4 text-sm font-medium text-accent-gold">${t('landing.browseLaw')} ${ICON_ARROW}</p>
    </a>`;
}

function featureCard(iconSvg: string, title: string, body: string, index: number): string {
  return `
    <div data-reveal data-reveal-delay="${index * 80}ms"
      class="rounded-2xl bg-surface p-6 shadow-sm">
      <span class="inline-flex rounded-xl bg-accent/10 p-2.5 text-accent">${iconSvg}</span>
      <h3 class="mt-4 font-semibold">${title}</h3>
      <p class="mt-2 text-sm leading-7 text-text-secondary">${body}</p>
    </div>`;
}

export function mountLandingPage(container: HTMLElement): void {
  document.title = `L-LEX — ${t('app.name')}`;
  const locale = getLocale();
  const totalArticles = LAWS.reduce((sum, law) => sum + law.articleCount, 0);
  const searchHref = routePath({ name: 'home' }, locale);

  const penaltyChips = PENALTY_TAGS.filter((tag) => tag !== 'other')
    .map(
      (tag: PenaltyTag, index) => `
        <a data-link href="${searchHref}?penalty=${tag}"
          data-reveal data-reveal-delay="${index * 40}ms"
          class="rounded-full border border-border bg-surface px-4 py-2 text-sm text-text-secondary shadow-sm transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-accent hover:text-accent hover:shadow-md">
          ${penaltyLabel(tag)}
        </a>`,
    )
    .join('');

  container.innerHTML = `
    <section class="relative flex min-h-[calc(100dvh-12rem)] flex-col items-center justify-center gap-7 py-14 text-center">
      <a data-link href="${searchHref}"
        class="link-underline absolute end-0 top-4 text-sm text-text-secondary hover:text-text-primary">
        ${t('landing.skipToSearch')} <span aria-hidden="true" class="inline-block rtl:rotate-180">→</span>
      </a>
      <div class="stagger-item">${HERO_SCALES}</div>
      <h1 class="stagger-item max-w-2xl text-3xl font-bold leading-tight tracking-[-0.02em] text-accent sm:text-5xl"
        style="animation-delay: 100ms">${t('app.tagline')}</h1>
      <p class="stagger-item max-w-xl leading-8 text-text-secondary" style="animation-delay: 180ms">
        ${t('landing.subline')}
      </p>
      <div class="stagger-item flex flex-col items-center gap-3" style="animation-delay: 260ms">
        <a data-link href="${searchHref}"
          class="rounded-xl bg-accent-gold px-8 py-3.5 text-lg font-semibold text-white shadow-md transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] dark:text-bg"
        >${t('landing.getStarted')}</a>
      </div>
      <div class="flex flex-wrap items-stretch justify-center gap-4 pt-2">
        ${statCard(totalArticles, t('landing.statsArticles'), 0)}
        ${statCard(PENALTY_TAGS.length, t('landing.statsCategories'), 1)}
        ${statCard(3, t('landing.statsLanguages'), 2)}
      </div>
    </section>

    <section class="mx-auto max-w-4xl space-y-6 py-12" data-reveal>
      ${heading(t('landing.lawsTitle'))}
      <div class="grid gap-5 sm:grid-cols-2">
        ${LAW_IDS.map((id, index) => lawCard(id, index)).join('')}
      </div>
    </section>

    <section class="mx-auto max-w-4xl space-y-6 py-12" data-reveal>
      ${heading(t('landing.penaltiesTitle'))}
      <div class="flex flex-wrap gap-2.5">${penaltyChips}</div>
    </section>

    <section class="mx-auto max-w-4xl space-y-6 py-12" data-reveal>
      ${heading(t('landing.featuresTitle'))}
      <div class="grid gap-5 sm:grid-cols-3">
        ${featureCard(ICON_GLOBE, t('landing.featureTrilingual'), t('landing.featureTrilingualBody'), 0)}
        ${featureCard(ICON_BOLT, t('landing.featureSearch'), t('landing.featureSearchBody'), 1)}
        ${featureCard(ICON_SHIELD, t('landing.featurePrivacy'), t('landing.featurePrivacyBody'), 2)}
      </div>
    </section>

    <section class="mx-auto max-w-4xl py-12" data-reveal>
      <div class="rounded-2xl border border-accent-gold/40 bg-accent-gold/5 p-6 shadow-sm sm:p-8">
        <p class="leading-8">${t('footer.disclaimer')}</p>
        <div class="mt-5 flex flex-wrap items-center gap-4">
          <a data-link href="${routePath({ name: 'about' }, locale)}"
            class="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg shadow-sm transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
          >${t('landing.aboutCta')}</a>
          <a href="mailto:${REPORT_EMAIL}?subject=L-LEX"
            class="link-underline text-sm text-text-secondary hover:text-text-primary"
          >${t('footer.reportError')}</a>
        </div>
      </div>
    </section>`;

  setupCountUps(container);
  setupReveals(container);
}

function setupCountUps(container: HTMLElement): void {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const counter of container.querySelectorAll<HTMLElement>('[data-count-up]')) {
    const target = Number(counter.dataset.countUp);
    if (reduced) {
      counter.textContent = String(target);
      continue;
    }
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

function setupReveals(container: HTMLElement): void {
  const items = container.querySelectorAll<HTMLElement>('[data-reveal]');
  if (
    matchMedia('(prefers-reduced-motion: reduce)').matches ||
    typeof IntersectionObserver === 'undefined'
  ) {
    for (const item of items) item.classList.add('is-revealed');
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        element.style.animationDelay = element.dataset.revealDelay ?? '0ms';
        element.classList.add('is-revealed');
        observer.unobserve(element);
      }
    },
    { threshold: 0.15 },
  );
  for (const item of items) observer.observe(item);
}
