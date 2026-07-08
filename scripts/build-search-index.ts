/**
 * Search-index build — CLAUDE.md §6.2 step 4.
 *
 * Extracts the compact searchable projection of every article into
 * content/normalized/search-index.json, which the client fetches and feeds to
 * the FlexSearch engine (src/lib/search.ts). Text is stored raw; §6.3
 * normalization is applied by the shared encoder at index/query time, so the
 * displayed snippets keep the authentic source text.
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Article } from '../src/lib/types.ts';
import type { SearchDoc, SearchIndexFile } from '../src/lib/search.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARTICLES_PATH = join(ROOT, 'content/normalized/articles.ckb.json');
const OUT_PATH = join(ROOT, 'content/normalized/search-index.json');

const articles: Article[] = JSON.parse(readFileSync(ARTICLES_PATH, 'utf8'));

const docs: SearchDoc[] = articles.map((article) => ({
  id: article.id,
  lawId: article.lawId,
  n: article.articleNumber,
  tags: article.penaltyTags,
  title: article.content.ckb.title,
  conditions: article.content.ckb.conditions,
  penalties: article.content.ckb.penalties,
}));

const file: SearchIndexFile = {
  generatedAt: new Date().toISOString(),
  count: docs.length,
  docs,
};

writeFileSync(OUT_PATH, JSON.stringify(file));
const kb = Math.round(statSync(OUT_PATH).size / 1024);
console.log(`✓ search-index.json: ${docs.length} docs, ${kb} KB`);
