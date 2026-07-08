import '@fontsource-variable/vazirmatn/index.css';
import './app.css';
import { initTheme } from './lib/theme.ts';
import { adoptLocale, getLocale, initLocale, onLocaleChange, t } from './lib/i18n.ts';
import type { Route } from './lib/router.ts';
import { navigate, parseLocation, routePath, setRouteListener } from './lib/router.ts';
import { renderHeader, wireHeader } from './components/layout/Header.ts';
import { renderFooter, wireFooter } from './components/layout/Footer.ts';
import { mountHomePage } from './pages/home.ts';
import { mountLawPage } from './pages/law.ts';
import { mountArticlePage } from './pages/article.ts';
import { mountFavoritesPage } from './pages/favorites.ts';
import { mountAboutPage } from './pages/about.ts';
import { mountNotFoundPage } from './pages/notFound.ts';
import { maybePlayIntro } from './components/hero/JusticeScalesIntro.ts';

const appElement = document.querySelector<HTMLDivElement>('#app');
if (!appElement) throw new Error('#app root element missing');
const app: HTMLDivElement = appElement;

let currentRoute: Route = { name: 'home' };

function mountPage(main: HTMLElement, route: Route): void {
  switch (route.name) {
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

// The whole shell re-renders on locale change and navigation — cheap at this
// scale and keeps translated strings, lang/dir, and nav state consistent.
function renderShell(): void {
  document.title = `L-LEX — ${t('app.name')}`;
  app.innerHTML = `
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-text-primary focus:shadow-lg"
    >${t('nav.skipToContent')}</a>
    <div class="flex min-h-dvh flex-col bg-bg text-text-primary">
      ${renderHeader(currentRoute.name)}
      <main id="main" class="mx-auto w-full max-w-5xl flex-1 px-4 pb-16"></main>
      ${renderFooter()}
    </div>`;
  wireHeader(app);
  wireFooter(app);
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

window.addEventListener('popstate', () => {
  const { locale, route } = parseLocation(location.pathname);
  currentRoute = route;
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
currentRoute = initial.route;
renderShell();
// §9: intro plays only on an initial home-page load, never on internal navigation.
if (initial.route.name === 'home') maybePlayIntro();
