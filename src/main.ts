import '@fontsource-variable/vazirmatn/index.css';
import './app.css';
import { initTheme } from './lib/theme.ts';
import { adoptLocale, getLocale, initLocale, onLocaleChange, t } from './lib/i18n.ts';
import type { Route } from './lib/router.ts';
import { navigate, parseLocation, routePath, setRouteListener } from './lib/router.ts';
import { renderHeader, wireHeader } from './components/layout/Header.ts';
import { renderFooter, wireFooter } from './components/layout/Footer.ts';
import { mountLandingPage } from './pages/landing.ts';
import { mountHomePage } from './pages/home.ts';
import { mountLawPage } from './pages/law.ts';
import { mountArticlePage } from './pages/article.ts';
import { mountFavoritesPage } from './pages/favorites.ts';
import { mountAboutPage } from './pages/about.ts';
import { mountNotFoundPage } from './pages/notFound.ts';

const appElement = document.querySelector<HTMLDivElement>('#app');
if (!appElement) throw new Error('#app root element missing');
const app: HTMLDivElement = appElement;

let currentRoute: Route = { name: 'home' };

function mountPage(main: HTMLElement, route: Route): void {
  switch (route.name) {
    case 'landing':
      mountLandingPage(main);
      break;
    case 'home':
      mountHomePage(main);
      break;
    case 'law':
      void mountLawPage(main, route.lawSlug);
      break;
    case 'article':
      void mountArticlePage(main, route.lawSlug, route.articleNumber);
      break;
    case 'favorites':
      void mountFavoritesPage(main);
      break;
    case 'about':
      mountAboutPage(main);
      break;
    case 'notFound':
      mountNotFoundPage(main);
      break;
  }
}

// Beta banner (§0 deployment safety): shown on every page until the data set
// is complete and §15-verified; dismissal lasts one browser session only.
const BANNER_DISMISS_KEY = 'laws:beta-banner-dismissed';

function bannerDismissed(): boolean {
  try {
    return sessionStorage.getItem(BANNER_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function renderBetaBanner(): string {
  if (bannerDismissed()) return '';
  return `
    <div
      data-beta-banner
      role="status"
      class="no-print flex items-center justify-center gap-3 border-b border-accent-gold/40 bg-accent-gold/10 px-4 py-2 text-sm"
    >
      <span class="text-center">
        ${t('banner.beta')}
        <a data-link href="${routePath({ name: 'about' }, getLocale())}"
          class="underline underline-offset-4 hover:text-accent-gold">${t('nav.about')}</a>
      </span>
      <button type="button" data-banner-dismiss aria-label="${t('banner.dismiss')}"
        class="shrink-0 rounded-md p-1 hover:bg-surface-hover">
        <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </div>`;
}

// The whole shell re-renders on locale change and navigation — cheap at this
// scale and keeps translated strings, lang/dir, and nav state consistent.
function renderShell(): void {
  document.title = `L-LEX — ${t('app.name')}`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('app.tagline'));
  app.innerHTML = `
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-text-primary focus:shadow-lg"
    >${t('nav.skipToContent')}</a>
    <div class="flex min-h-dvh flex-col bg-bg text-text-primary">
      ${renderBetaBanner()}
      ${renderHeader(currentRoute.name)}
      <main id="main" class="mx-auto w-full max-w-5xl flex-1 px-4 pb-16"></main>
      ${renderFooter()}
    </div>`;
  wireHeader(app);
  wireFooter(app);
  app.querySelector('[data-banner-dismiss]')?.addEventListener('click', () => {
    try {
      sessionStorage.setItem(BANNER_DISMISS_KEY, '1');
    } catch {
      /* dismissal just won't persist */
    }
    app.querySelector('[data-beta-banner]')?.remove();
  });
  const main = app.querySelector<HTMLElement>('#main');
  if (main) mountPage(main, currentRoute);
}

setRouteListener((route) => {
  currentRoute = route;
  renderShell();
});

// Same-origin app links (a[data-link]) route client-side.
document.addEventListener('click', (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  const anchor = (event.target as HTMLElement).closest('a[data-link]');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  event.preventDefault();
  const { route } = parseLocation(new URL(anchor.href).pathname);
  navigate(route, getLocale());
});

// Back-compat: links shared before the landing page existed used '/' with
// search params — those still open the search app, not the landing hero.
function resolveRoute(route: Route): Route {
  if (route.name === 'landing') {
    const params = new URLSearchParams(location.search);
    if (params.has('q') || params.has('law') || params.has('penalty')) return { name: 'home' };
  }
  return route;
}

window.addEventListener('popstate', () => {
  const { locale, route } = parseLocation(location.pathname);
  currentRoute = resolveRoute(route);
  if (locale !== getLocale()) {
    adoptLocale(locale); // triggers the locale-change re-render below
  } else {
    renderShell();
  }
});

// Locale changes (switcher or adopt): mirror the prefix into the URL, re-render.
onLocaleChange((locale) => {
  history.replaceState(null, '', routePath(currentRoute, locale) + location.search);
  renderShell();
});

initTheme();
const initial = parseLocation(location.pathname);
initLocale(initial.locale !== 'ckb' ? initial.locale : undefined);
// Unprefixed URL but a stored non-ckb preference: reflect it in the URL (§12).
if (initial.locale === 'ckb' && getLocale() !== 'ckb') {
  history.replaceState(null, '', routePath(initial.route, getLocale()) + location.search);
}
currentRoute = resolveRoute(initial.route);
renderShell();
