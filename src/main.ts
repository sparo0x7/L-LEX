import '@fontsource-variable/vazirmatn/index.css';
import './app.css';
import { initTheme } from './lib/theme.ts';
import { initLocale, onLocaleChange, t } from './lib/i18n.ts';
import { renderHeader, wireHeader } from './components/layout/Header.ts';
import { renderFooter, wireFooter } from './components/layout/Footer.ts';

const appElement = document.querySelector<HTMLDivElement>('#app');
if (!appElement) throw new Error('#app root element missing');
const app: HTMLDivElement = appElement;

// The whole shell re-renders on locale change — cheap at this scale and keeps
// every translated string, lang attribute, and RTL/LTR direction consistent.
function renderShell(): void {
  document.title = `L-LEX — ${t('app.name')}`;
  app.innerHTML = `
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-text-primary focus:shadow-lg"
    >${t('nav.skipToContent')}</a>
    <div class="flex min-h-dvh flex-col bg-bg text-text-primary">
      ${renderHeader()}
      <main
        id="main"
        class="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center"
      >
        <h1 class="text-3xl font-bold text-accent sm:text-4xl">${t('app.tagline')}</h1>
        <p class="max-w-xl leading-relaxed text-text-secondary">${t('shell.phaseNote')}</p>
      </main>
      ${renderFooter()}
    </div>`;
  wireHeader(app);
  wireFooter(app);
}

initTheme();
initLocale();
renderShell();
onLocaleChange(renderShell);
