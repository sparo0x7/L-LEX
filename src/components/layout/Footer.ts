import { t } from '../../lib/i18n.ts';
import { clearAllStored } from '../../lib/storage.ts';
import { formatVisitorCount, getVisitorCount } from '../../lib/visitors.ts';

// §15 error-report contact — confirm or change before launch.
export const REPORT_EMAIL = 'lassmohammed98@gmail.com';

export function renderFooter(): string {
  return `
    <footer class="mt-auto border-t border-border bg-bg-subtle">
      <div class="mx-auto max-w-5xl space-y-3 px-4 py-6 text-sm text-text-secondary">
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
          <a
            class="link-underline hover:text-text-primary"
            href="mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(t('app.name'))}"
          >${t('footer.reportError')}</a>
          <button
            type="button"
            data-clear-data
            class="link-underline hover:text-text-primary"
          >${t('footer.clearData')}</button>
          <span data-visitor class="hidden text-text-primary">
            ${t('footer.visitors')}: <span dir="ltr" data-visitor-count></span>
          </span>
        </div>
        <p class="text-xs">
          <span dir="ltr">© 2026 L-LEX</span> · ${t('footer.builtBy')}
          <a
            class="underline underline-offset-4 hover:text-text-primary"
            href="https://www.facebook.com/las.mhamad.1"
            rel="author"
            dir="ltr"
          >Las Khoshnaw</a>
        </p>
      </div>
    </footer>`;
}

export function wireFooter(root: ParentNode): void {
  void getVisitorCount().then((count) => {
    const wrap = root.querySelector<HTMLElement>('[data-visitor]');
    const target = root.querySelector<HTMLElement>('[data-visitor-count]');
    if (count === null || !wrap?.isConnected || !target) return;
    target.textContent = formatVisitorCount(count);
    wrap.classList.remove('hidden');
  });

  const button = root.querySelector<HTMLButtonElement>('[data-clear-data]');
  button?.addEventListener('click', () => {
    if (!confirm(t('footer.clearDataConfirm'))) return;
    clearAllStored();
    button.textContent = t('footer.clearDataDone');
    button.disabled = true;
    setTimeout(() => location.reload(), 600);
  });
}
