/**
 * Penalty classification — CLAUDE.md §6.2 step 2.
 *
 * Exports `classifyPenalties()` for use by normalize-source.ts, and doubles as a
 * standalone script that re-tags content/normalized/articles.ckb.json in place
 * (useful when refining patterns without re-running the whole normalization).
 *
 * Patterns were refined against the actual corpus before implementation — the
 * brief's starting patterns were a first pass. Key corrections from the audit of
 * all 557 penalty texts:
 *   - Death sentences are phrased with سێدارە "gallows" (54×) or Arabic إعدام (17×);
 *     the phrase سزای مەرگ from the starting pattern never occurs.
 *   - Life vs temporary imprisonment: زیندانی هەمیشەیی (68×) vs زیندانی کاتی (188×).
 *     Bare زیندانی only counts as `imprisonment` when not followed by هەمیشەیی.
 *   - زیندان (السجن) is the felony-grade custodial penalty → `imprisonment`;
 *     حەبس (الحبس, 289×) is the misdemeanor-grade one → `detention`.
 *   - دەرکردن alone is ambiguous: it means "issuing" (a verdict, order, decree),
 *     deportation (penal art. 106), or eviction (art. 475). It only counts as
 *     `dismissal` anchored to service context (لە خزمەت / لە کار / لە ڕیز …).
 *   - Arabic و Kurdish yaa differ (توقيف vs توقیف) — both forms are listed; the
 *     stored text is never normalized (§6.3 normalization applies at search time).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Article, PenaltyTag } from '../src/lib/types.ts';

export const PENALTY_PATTERNS: ReadonlyArray<readonly [PenaltyTag, RegExp]> = [
  ['death-penalty', /سزای مەرگ|سێدارە|إعدام|اعدام/u],
  ['life-imprisonment', /زیندانی هەمیشەیی|زیندانی تاهەتایی|المؤبد/u],
  ['imprisonment', /زیندانی(?!\s*هەمیشەیی)|السجن(?!\s*المؤبد)/u],
  ['fine', /غەرامە|غرامة/u],
  ['detention', /حەبس|حبس|بەندکردن|توقیف|التوقيف/u],
  [
    'dismissal',
    /دەرکردن[^،.؛]{0,40}لە (?:خزمەت|کار|ڕیز)|لەگەڵ دەرکردن(?!ی)|بڕیاری دەرکردن|الطرد|العزل|فصل من|بەخانەنشینکردنی زۆرەملێ/u,
  ],
  ['demotion', /دابەزاندنی پلە|پلەبەزاندن|تنزيل الرتبة/u],
  [
    'suspension',
    /ڕاگرتن[^،.؛]{0,25}لە (?:کار|دەوام|خزمەت)|لە دەوام دەوەستێنرێت|الإيقاف عن العمل|سحب اليد/u,
  ],
  ['reprimand', /تەوبیخ|توبیخ|سەرزەنشت|إنذار/u],
  ['salary-cut', /بڕینی مووچە|قطع الراتب/u],
  ['confiscation', /زەوتکردن|مصادرة/u],
];

export function classifyPenalties(penaltyText: string): PenaltyTag[] {
  const tags = PENALTY_PATTERNS.filter(([, pattern]) => pattern.test(penaltyText)).map(
    ([tag]) => tag,
  );
  return tags.length > 0 ? tags : ['other'];
}

/** Re-tag an existing normalized articles file; returns the tag distribution. */
function retagNormalizedArticles(articlesPath: string): Record<string, number> {
  const articles: Article[] = JSON.parse(readFileSync(articlesPath, 'utf8'));
  const distribution: Record<string, number> = {};
  let changed = 0;

  for (const article of articles) {
    const tags = classifyPenalties(article.content.ckb.penalties);
    if (JSON.stringify(tags) !== JSON.stringify(article.penaltyTags)) {
      article.penaltyTags = tags;
      changed++;
    }
    for (const tag of tags) distribution[tag] = (distribution[tag] ?? 0) + 1;
  }

  if (changed > 0) writeFileSync(articlesPath, JSON.stringify(articles, null, 2) + '\n');
  console.log(`Re-tagged ${articles.length} articles (${changed} changed).`);
  return distribution;
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const distribution = retagNormalizedArticles(join(root, 'content/normalized/articles.ckb.json'));
  console.log('Tag distribution:');
  for (const [tag, count] of Object.entries(distribution).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tag.padEnd(20)} ${count}`);
  }
}
