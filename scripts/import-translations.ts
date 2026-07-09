/**
 * Import user-supplied en/ar translations from law_data_json/*_trilingual.json
 * into content/normalized/articles.{en,ar}.json (the same shape the Phase 6
 * pipeline produces, so the UI wiring is unchanged).
 *
 * QUALITY GATE (2026-07-09 audit): ~98% of the trilingual rows are templated
 * wrappers, not translations — English boilerplate ("Statutory Provisions and
 * Conditions…") and Arabic prefixes with the raw Kurdish text embedded.
 * Publishing those would show readers official-sounding text that does not
 * convey the article's meaning. An article's en/ar is therefore imported ONLY
 * when it contains no Kurdish-only letters and no boilerplate markers;
 * everything else stays 'missing' (UI falls back to the Sorani source with
 * the badge). Re-run after improving the JSON — accepted articles flow in
 * incrementally, keyed by source hash.
 *
 * Imported content is marked translationStatus 'machine' — user-supplied but
 * not §15-reviewed; the "not yet legally reviewed" badge stays.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Article, ArticleContent } from '../src/lib/types.ts';
import type { LawId } from '../src/lib/types.ts';
import type {
  TargetLocale,
  TranslatedArticle,
  TranslatedArticleFile,
} from './translate-articles.ts';
import { hashSource, reconstructFormattedText } from './translate-articles.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

interface TrilingualRow {
  article_number: number;
  [key: string]: string | number;
}

const SOURCES: ReadonlyArray<{ file: string; lawId: LawId }> = [
  { file: 'iraqi_penal_code_1969_trilingual.json', lawId: 'iraqi-penal-code-1969' },
  {
    file: 'kurdistan_internal_security_forces_law_trilingual.json',
    lawId: 'kurdistan-internal-security-forces-law',
  },
];

// Kurdish-only letters — legitimate Arabic/English translations never contain them.
const KURDISH_LETTERS = /[ەێۆڕڵگچپڤ]/u;
const BOILERPLATE_MARKERS: Record<TargetLocale, RegExp> = {
  en: /Statutory Provisions and Conditions|Legal Consequences and Statutory Penalties/,
  ar: /الأحكام والشروط القانونية المعمول بها|العقوبات والجزاءات المترتبة وفقاً للقانون/,
};

export function isGenuineTranslation(
  title: string,
  penalties: string,
  target: TargetLocale,
): boolean {
  const combined = `${title}\n${penalties}`;
  return !KURDISH_LETTERS.test(combined) && !BOILERPLATE_MARKERS[target].test(combined);
}

/** Strip the redundant "Article N - " / "المادة N - " prefix and split title/conditions. */
export function splitImportedTitle(
  raw: string,
  articleNumber: number,
  target: TargetLocale,
): { title: string; conditions: string } {
  const prefix =
    target === 'en'
      ? new RegExp(`^Article\\s+${articleNumber}\\s*[-–—:]\\s*`)
      : new RegExp(`^المادة\\s+${articleNumber}\\s*[-–—:]\\s*`);
  const text = raw.replace(prefix, '').trim();
  const separator = target === 'en' ? ';' : /[؛;]/;
  const index = typeof separator === 'string' ? text.indexOf(separator) : text.search(separator);
  if (index === -1) return { title: '', conditions: text };
  return { title: text.slice(0, index).trim(), conditions: text.slice(index + 1).trim() };
}

function main(): void {
  const articles: Article[] = JSON.parse(
    readFileSync(join(ROOT, 'content/normalized/articles.ckb.json'), 'utf8'),
  );
  const articleById = new Map(articles.map((article) => [article.id, article]));

  for (const target of ['en', 'ar'] as const) {
    const accepted: TranslatedArticle[] = [];
    const rejectedByLaw = new Map<LawId, number>();

    for (const source of SOURCES) {
      const rows: TrilingualRow[] = JSON.parse(
        readFileSync(join(ROOT, 'law_data_json', source.file), 'utf8'),
      );
      for (const row of rows) {
        const id = `${source.lawId}-${row.article_number}`;
        const article = articleById.get(id);
        const rawTitle = String(row[`title_and_conditions_${target}`] ?? '');
        const rawPenalties = String(row[`consequences_and_penalties_${target}`] ?? '');
        if (!article || !rawTitle.trim() || !rawPenalties.trim()) continue;

        if (!isGenuineTranslation(rawTitle, rawPenalties, target)) {
          rejectedByLaw.set(source.lawId, (rejectedByLaw.get(source.lawId) ?? 0) + 1);
          continue;
        }

        const { title, conditions } = splitImportedTitle(rawTitle, row.article_number, target);
        const content: ArticleContent = {
          title,
          conditions,
          penalties: rawPenalties.trim(),
          formattedText: reconstructFormattedText(target, row.article_number, {
            title,
            conditions,
            penalties: rawPenalties.trim(),
          }),
        };
        accepted.push({ id, srcHash: hashSource(article), translationStatus: 'machine', content });
      }
    }

    const file: TranslatedArticleFile = {
      generatedAt: new Date().toISOString(),
      engine: 'user-supplied trilingual JSON (quality-gated import)',
      locale: target,
      articles: accepted,
    };
    writeFileSync(
      join(ROOT, `content/normalized/articles.${target}.json`),
      JSON.stringify(file, null, 2) + '\n',
    );
    const rejected = [...rejectedByLaw.entries()]
      .map(([law, count]) => `${law}: ${count}`)
      .join(', ');
    console.log(
      `✓ ${target}: ${accepted.length} genuine translations imported; rejected as templated/untranslated → ${rejected || 'none'}`,
    );
  }
}

main();
