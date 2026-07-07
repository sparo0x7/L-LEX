import './app.css';

// Phase 0 placeholder shell — proves the token system and dark-mode wiring.
// Replaced by the real layout components in Phase 2.
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app root element missing');

app.innerHTML = `
  <main class="min-h-dvh flex items-center justify-center bg-bg text-text-primary">
    <div class="text-center space-y-4 p-8">
      <svg class="mx-auto size-14 text-accent" viewBox="0 0 64 64" fill="none"
           stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
           role="img" aria-label="تەرازووی دادپەروەری">
        <circle cx="32" cy="13" r="3" />
        <path d="M32 16v30" />
        <path d="M22 52h20M32 46v6" />
        <path d="M12 20h40" />
        <path d="M12 20 5 34m7-14 7 14M5 34a7 7 0 0 0 14 0" />
        <path d="M52 20l-7 14m7-14 7 14m-14 0a7 7 0 0 0 14 0" />
      </svg>
      <h1 class="text-2xl font-semibold">گەڕان لە یاساکان</h1>
      <p class="text-text-secondary">Phase 0 scaffold — design tokens wired for light and dark.</p>
      <button
        id="theme-toggle"
        class="rounded-md border border-border bg-surface px-4 py-2 text-sm hover:bg-surface-hover"
      >
        Toggle theme
      </button>
    </div>
  </main>
`;

document.querySelector<HTMLButtonElement>('#theme-toggle')?.addEventListener('click', () => {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('theme', next);
  } catch {
    /* storage unavailable — theme still applies for this page view */
  }
});
