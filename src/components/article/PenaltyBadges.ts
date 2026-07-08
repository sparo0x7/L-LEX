import type { PenaltyTag } from '../../lib/types.ts';
import { penaltyLabel } from '../search/Filters.ts';

function badgeClasses(tag: PenaltyTag): string {
  if (tag === 'death-penalty') return 'border-danger/40 bg-danger/10 text-danger';
  if (tag === 'life-imprisonment')
    return 'border-accent-gold/40 bg-accent-gold/10 text-accent-gold';
  return 'border-border bg-bg-subtle text-text-secondary';
}

export function renderPenaltyBadges(tags: PenaltyTag[]): string {
  return tags
    .map(
      (tag) =>
        `<span class="rounded-full border px-2 py-0.5 text-xs ${badgeClasses(tag)}">${penaltyLabel(tag)}</span>`,
    )
    .join('');
}
