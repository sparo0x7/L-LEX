/**
 * Source normalization — CLAUDE.md §6.2 step 1.
 *
 * Reads content/source/*.json and writes content/normalized/laws.json +
 * articles.ckb.json in the §6.1 shape. Runs at build time only, never on the
 * client. Penalty tagging (step 2) is applied inline via classify-penalties.ts.
 *
 * en/ar content is written as empty with translationStatus 'missing' until the
 * Phase 6 translation pipeline runs; the UI must fall back to ckb, never blank.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Article, ArticleContent, Law, LawId, Locale } from '../src/lib/types.ts';
import { classifyPenalties } from './classify-penalties.ts';

interface RawArticle {
  article_number: number;
  law_name: string;
  title_and_conditions: string;
  consequences_and_penalties: string;
  formatted_text: string;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCES: ReadonlyArray<{
  file: string;
  lawId: LawId;
  category: Law['category'];
  citations?: Partial<Record<Locale, string>>;
}> = [
  {
    file: 'iraqi_penal_code_1969.json',
    lawId: 'iraqi-penal-code-1969',
    category: 'penal',
    // Direct rendering of the number/year already present in law_name (١١١ی ساڵی ١٩٦٩).
    citations: { en: 'Iraqi Penal Code No. 111 of 1969' },
  },
  {
    file: 'kurdistan_internal_security_forces_law.json',
    lawId: 'kurdistan-internal-security-forces-law',
    category: 'security',
    // TODO: en/ar citation requires verification against parliament.krd — several
    // candidate laws exist (No. 17/2008, No. 14/2011 implementing law, …). Do not guess.
  },
];

/**
 * All 557 source articles follow '{title} ({arabic term})؛ {conditions}' — the
 * Arabic semicolon after the parenthetical term separates title from body
 * (verified 557/557 in the pre-implementation audit). The no-delimiter branch
 * is defensive, for future source files only.
 */
function splitTitleAndConditions(text: string): { title: string; conditions: string } {
  const separatorIndex = text.indexOf('؛');
  if (separatorIndex === -1) return { title: '', conditions: text.trim() };
  return {
    title: text.slice(0, separatorIndex).trim(),
    conditions: text.slice(separatorIndex + 1).trim(),
  };
}

function emptyContent(): ArticleContent {
  return { title: '', conditions: '', penalties: '', formattedText: '' };
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function main(): void {
  const laws: Law[] = [];
  const articles: Article[] = [];
  // Import date, NOT human verification — must be checked against the official
  // gazette / parliament.krd and updated before publishing (CLAUDE.md §15).
  const importDate = new Date().toISOString().slice(0, 10);

  for (const source of SOURCES) {
    const raw: RawArticle[] = JSON.parse(
      readFileSync(join(ROOT, 'content/source', source.file), 'utf8'),
    );
    if (raw.length === 0) fail(`${source.file}: no articles`);

    const firstArticle = raw[0];
    if (!firstArticle) fail(`${source.file}: no articles`);

    raw.forEach((record, index) => {
      if (record.article_number !== index + 1) {
        fail(`${source.file}: expected article ${index + 1}, got ${record.article_number}`);
      }
      if (!record.title_and_conditions.trim() || !record.consequences_and_penalties.trim()) {
        fail(`${source.file}: article ${record.article_number} has an empty content field`);
      }
    });

    laws.push({
      id: source.lawId,
      slug: source.lawId,
      // sourceUrl stays absent until verified against the official source.
      officialCitation: { ckb: firstArticle.law_name, ...source.citations },
      category: source.category,
      articleCount: raw.length,
      lastVerified: importDate,
    });

    for (const record of raw) {
      const { title, conditions } = splitTitleAndConditions(record.title_and_conditions);
      articles.push({
        id: `${source.lawId}-${record.article_number}`,
        lawId: source.lawId,
        articleNumber: record.article_number,
        penaltyTags: classifyPenalties(record.consequences_and_penalties),
        content: {
          ckb: {
            title,
            conditions,
            penalties: record.consequences_and_penalties,
            formattedText: record.formatted_text,
          },
          en: emptyContent(),
          ar: emptyContent(),
        },
        translationStatus: { ckb: 'source', en: 'missing', ar: 'missing' },
      });
    }
  }

  const outDir = join(ROOT, 'content/normalized');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'laws.json'), JSON.stringify(laws, null, 2) + '\n');
  writeFileSync(join(outDir, 'articles.ckb.json'), JSON.stringify(articles, null, 2) + '\n');

  const emptyTitles = articles.filter((a) => a.content.ckb.title === '').length;
  const distribution: Record<string, number> = {};
  for (const article of articles) {
    for (const tag of article.penaltyTags) distribution[tag] = (distribution[tag] ?? 0) + 1;
  }

  console.log(`✓ ${laws.length} laws, ${articles.length} articles → content/normalized/`);
  console.log(`  articles with empty title after split: ${emptyTitles}`);
  console.log('  penalty tag distribution:');
  for (const [tag, count] of Object.entries(distribution).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${tag.padEnd(20)} ${count}`);
  }
}

main();
