import { t } from '../../lib/i18n.ts';
import { clearAllStored } from '../../lib/storage.ts';

// §15 error-report contact — confirm or change before launch.
const REPORT_EMAIL = 'farhangfatih211@gmail.com';

export function renderFooter(): string {
  return `
    <footer class="mt-auto border-t border-border bg-bg-subtle">
      <div class="mx-auto max-w-5xl space-y-3 px-4 py-6 text-sm text-text-secondary">
        <p>${t('footer.disclaimer')}</p>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
          <a
            class="underline underline-offset-4 hover:text-text-primary"
            href="mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(t('app.name'))}"
          >${t('footer.reportError')}</a>
          <button
            type="button"
            data-clear-data
            class="underline underline-offset-4 hover:text-text-primary"
          >${t('footer.clearData')}</button>
        </div>
        <p class="text-xs" dir="ltr">
          © 2026 L-LEX · Built by
          <a
            class="underline underline-offset-4 hover:text-text-primary"
            href="https://github.com/MrGuevar4"
            rel="author"
          >Las Khoshnaw</a>
        </p>
      </div>
    </footer>`;
}

export function wireFooter(root: ParentNode): void {
  const button = root.querySelector<HTMLButtonElement>('[data-clear-data]');
  button?.addEventListener('click', () => {
    if (!confirm(t('footer.clearDataConfirm'))) return;
    clearAllStored();
    button.textContent = t('footer.clearDataDone');
    button.disabled = true;
    setTimeout(() => {
      button.textContent = t('footer.clearData');
      button.disabled = false;
    }, 2000);
  });
}
