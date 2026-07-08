/**
 * Opening animation — CLAUDE.md §9. Hand-built SVG + CSS (no Lottie asset was
 * sourced): the beam rocks and settles level, then the wordmark fades in.
 * Skippable at all times, plays once per browser session on the home page
 * only, and is skipped entirely under prefers-reduced-motion (the static
 * brand mark in the header serves as the fallback).
 */
import { t } from '../../lib/i18n.ts';

const SESSION_KEY = 'laws:intro-played';
const TOTAL_MS = 3200; // within the §8.3 2.5–3.5s budget, incl. fade-out

function alreadyPlayed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false; // no sessionStorage → still plays once per page load
  }
}

function markPlayed(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* nothing to persist to */
  }
}

export function maybePlayIntro(): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (alreadyPlayed()) return;
  markPlayed();

  const overlay = document.createElement('div');
  overlay.className =
    'intro-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-bg';
  overlay.innerHTML = `
    <svg class="intro-scales size-28 text-accent" viewBox="0 0 64 64" fill="none"
      stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">
      <circle cx="32" cy="13" r="3" />
      <path d="M32 16v30" />
      <path d="M22 52h20M32 46v6" />
      <g class="intro-beam">
        <path d="M12 20h40" />
        <path d="M12 20 5 34m7-14 7 14M5 34a7 7 0 0 0 14 0" />
        <path d="M52 20l-7 14m7-14 7 14m-14 0a7 7 0 0 0 14 0" />
      </g>
    </svg>
    <p class="intro-wordmark text-3xl font-bold tracking-widest text-accent" dir="ltr">L-LEX</p>
    <button type="button" data-intro-skip
      class="absolute bottom-8 rounded-md border border-border bg-surface px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
    >${t('intro.skip')}</button>`;

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown);
    overlay.classList.add('intro-closing');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    setTimeout(() => overlay.remove(), 600); // fallback if transitionend never fires
  };
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
  };

  overlay.querySelector('[data-intro-skip]')?.addEventListener('click', close);
  document.addEventListener('keydown', onKeydown);
  document.body.append(overlay);
  setTimeout(close, TOTAL_MS);
}
