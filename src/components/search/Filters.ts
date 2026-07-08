import type { LawId, PenaltyTag } from '../../lib/types.ts';
import type { MessageKey } from '../../lib/i18n.ts';
import { t } from '../../lib/i18n.ts';
import type { SearchSort } from '../../lib/search.ts';

export const LAW_IDS: LawId[] = ['iraqi-penal-code-1969', 'kurdistan-internal-security-forces-law'];

export const PENALTY_TAGS: PenaltyTag[] = [
  'death-penalty',
  'life-imprisonment',
  'imprisonment',
  'fine',
  'detention',
  'dismissal',
  'demotion',
  'suspension',
  'reprimand',
  'salary-cut',
  'confiscation',
  'other',
];

export function lawLabel(lawId: LawId): string {
  return t(`law.${lawId}` as MessageKey);
}

export function penaltyLabel(tag: PenaltyTag): string {
  return t(`penalty.${tag}` as MessageKey);
}

export interface FiltersState {
  law: LawId | '';
  penalty: PenaltyTag | '';
  sort: SearchSort;
}

export function renderFilters(state: FiltersState): string {
  const lawChip = (value: LawId | '', label: string) => `
    <button
      type="button"
      data-law-filter="${value}"
      aria-pressed="${state.law === value}"
      class="rounded-full border px-3 py-1.5 text-sm transition-colors ${
        state.law === value
          ? 'border-accent bg-accent text-bg'
          : 'border-border bg-surface text-text-secondary hover:text-text-primary'
      }"
    >${label}</button>`;

  const penaltyOptions = PENALTY_TAGS.map(
    (tag) =>
      `<option value="${tag}" ${state.penalty === tag ? 'selected' : ''}>${penaltyLabel(tag)}</option>`,
  ).join('');

  const selectClasses =
    'rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary';

  return `
    <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div role="group" aria-label="${t('filters.allLaws')}" class="flex flex-wrap items-center gap-2">
        ${lawChip('', t('filters.allLaws'))}
        ${LAW_IDS.map((id) => lawChip(id, lawLabel(id))).join('')}
      </div>
      <label class="flex items-center gap-2 text-sm text-text-secondary">
        ${t('filters.penaltyLabel')}
        <select data-penalty-filter class="${selectClasses}">
          <option value="">${t('filters.allPenalties')}</option>
          ${penaltyOptions}
        </select>
      </label>
      <label class="flex items-center gap-2 text-sm text-text-secondary">
        ${t('sort.label')}
        <select data-sort class="${selectClasses}">
          <option value="relevance" ${state.sort === 'relevance' ? 'selected' : ''}>${t('sort.relevance')}</option>
          <option value="number" ${state.sort === 'number' ? 'selected' : ''}>${t('sort.number')}</option>
        </select>
      </label>
    </div>`;
}
