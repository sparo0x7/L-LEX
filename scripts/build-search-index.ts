/**
 * Search-index build — CLAUDE.md §6.2 step 4.
 *
 * Extracts the compact searchable projection of every article into
 * content/normalized/search-index.json, which the client fetches and feeds to
 * the FlexSearch engine (src/lib/search.ts). Text is stored raw; §6.3
 * normalization is applied by the shared encoder at index/query time, so the
 * displayed snippets keep the authentic source text.
 */
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Article, Locale } from '../src/lib/types.ts';
import type { LocaleContentFile, SearchDoc, SearchIndexFile } from '../src/lib/search.ts';
import type { TranslatedArticleFile } from './translate-articles.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARTICLES_PATH = join(ROOT, 'content/normalized/articles.ckb.json');
const OUT_PATH = join(ROOT, 'content/normalized/search-index.json');

const articles: Article[] = JSON.parse(readFileSync(ARTICLES_PATH, 'utf8'));

// Translated locales (Phase 6 output) — optional inputs; content.{en,ar}.json
// are ALWAYS written (empty until translations exist) so the client's static
// imports resolve, and doc.status reflects what is actually available.
for (const locale of ['en', 'ar'] as const) {
  const inPath = join(ROOT, `content/normalized/articles.${locale}.json`);
  const contentFile: LocaleContentFile = { locale, articles: {} };
  if (existsSync(inPath)) {
    const translated: TranslatedArticleFile = JSON.parse(readFileSync(inPath, 'utf8'));
    for (const entry of translated.articles) {
      contentFile.articles[entry.id] = {
        title: entry.content.title,
        conditions: entry.content.conditions,
        penalties: entry.content.penalties,
        status: entry.translationStatus,
      };
    }
  }
  writeFileSync(
    join(ROOT, `content/normalized/content.${locale}.json`),
    JSON.stringify(contentFile),
  );
  console.log(`✓ content.${locale}.json: ${Object.keys(contentFile.articles).length} articles`);
}

const translatedStatus = new Map<string, Partial<Record<Locale, 'machine' | 'reviewed'>>>();
for (const locale of ['en', 'ar'] as const) {
  const file: LocaleContentFile = JSON.parse(
    readFileSync(join(ROOT, `content/normalized/content.${locale}.json`), 'utf8'),
  );
  for (const [id, entry] of Object.entries(file.articles)) {
    translatedStatus.set(id, { ...translatedStatus.get(id), [locale]: entry.status });
  }
}

const docs: SearchDoc[] = articles.map((article) => ({
  id: article.id,
  lawId: article.lawId,
  n: article.articleNumber,
  tags: article.penaltyTags,
  title: article.content.ckb.title,
  conditions: article.content.ckb.conditions,
  penalties: article.content.ckb.penalties,
  status: { ...article.translationStatus, ...translatedStatus.get(article.id) },
}));

const file: SearchIndexFile = {
  generatedAt: new Date().toISOString(),
  count: docs.length,
  docs,
};

writeFileSync(OUT_PATH, JSON.stringify(file));
const kb = Math.round(statSync(OUT_PATH).size / 1024);
console.log(`✓ search-index.json: ${docs.length} docs, ${kb} KB`);
