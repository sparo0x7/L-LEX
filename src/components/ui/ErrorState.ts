import { t } from '../../lib/i18n.ts';

export function renderLoadError(): string {
  return `
    <div class="rounded-xl border border-danger/30 bg-danger/5 px-6 py-10 text-center shadow-sm" role="alert">
      <p class="font-semibold">${t('error.load')}</p>
      <button type="button" data-reload-page
        class="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
      >${t('error.retry')}</button>
    </div>`;
}

export function showLoadError(host: HTMLElement): void {
  host.innerHTML = renderLoadError();
  host.querySelector<HTMLButtonElement>('[data-reload-page]')?.addEventListener('click', () => {
    location.reload();
  });
}
