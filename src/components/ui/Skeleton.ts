/** Shimmer skeletons shaped like the real content (design-elevation pass) —
 * used instead of text spinners for the loading states. Static under
 * prefers-reduced-motion via CSS. */

const bar = (classes: string) => `<div class="skeleton ${classes}"></div>`;

function cardBlock(): string {
  return `
    <div class="rounded-xl bg-surface p-4 shadow-sm">
      <div class="flex items-center gap-2">
        ${bar('h-6 w-24 rounded-md')}
        ${bar('h-4 w-32 rounded-md')}
      </div>
      ${bar('mt-3 h-5 w-3/4 rounded-md')}
      ${bar('mt-2 h-4 w-full rounded-md')}
      ${bar('mt-1.5 h-4 w-5/6 rounded-md')}
    </div>`;
}

/** Search results / favorites list. */
export function renderListSkeleton(count = 3): string {
  return `<div class="space-y-3" aria-hidden="true">${Array.from({ length: count }, cardBlock).join('')}</div>`;
}

/** Article page: header row + two labeled content sections. */
export function renderArticleSkeleton(): string {
  return `
    <div class="mt-4 space-y-5" aria-hidden="true">
      <div class="flex items-center gap-2">
        ${bar('h-8 w-28 rounded-md')}
        ${bar('h-4 w-40 rounded-md')}
      </div>
      ${bar('h-7 w-2/3 rounded-md')}
      <div class="rounded-xl bg-surface p-5 shadow-sm">
        ${bar('h-4 w-24 rounded-md')}
        ${bar('mt-3 h-4 w-full rounded-md')}
        ${bar('mt-2 h-4 w-11/12 rounded-md')}
        ${bar('mt-2 h-4 w-4/5 rounded-md')}
      </div>
      <div class="rounded-xl bg-surface p-5 shadow-sm">
        ${bar('h-4 w-24 rounded-md')}
        ${bar('mt-3 h-4 w-full rounded-md')}
        ${bar('mt-2 h-4 w-3/4 rounded-md')}
      </div>
    </div>`;
}

/** Law overview: header card + a stripe of TOC cells. */
export function renderLawSkeleton(): string {
  const cells = Array.from({ length: 24 }, () => bar('h-10 rounded-md')).join('');
  return `
    <div class="mt-4 space-y-6" aria-hidden="true">
      <div class="rounded-xl bg-surface p-5 shadow-sm">
        ${bar('h-7 w-1/2 rounded-md')}
        ${bar('mt-3 h-4 w-1/3 rounded-md')}
        ${bar('mt-2 h-4 w-2/5 rounded-md')}
      </div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2">${cells}</div>
    </div>`;
}
