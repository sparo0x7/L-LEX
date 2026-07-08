/**
 * Translation pipeline — CLAUDE.md §6.2 step 3 (redesigned 2026-07-08).
 *
 * Engine: Azure Translator REST v3 (free F0 tier — 2M chars/month; ckb
 * "Central Kurdish" is officially supported). Replaces the original LLM-call
 * design. Google Cloud Translation (also with explicit ckb support) is the
 * documented fallback for spot-checking weak articles.
 *
 * Only `title`, `conditions`, and `penalties` are translated (~226K source
 * chars → ~452K billed for en+ar); `formattedText` is reconstructed from the
 * translated fields, never re-translated.
 *
 * Glossary (§6.2): entries from content/glossary/legal-terms.json are applied
 * per target via Azure's dynamic-dictionary markup, which is why en and ar run
 * as separate passes (multi-target requests would force one rendering into
 * both outputs). After translation, a QA pass warns about any article where a
 * glossary term appeared in the source but the approved rendering is missing
 * from the output. Output carries translationStatus 'machine' — the free
 * engine does not change the §15 human-review requirement or the UI badge.
 *
 * Setup: AZURE_TRANSLATOR_KEY (required) and AZURE_TRANSLATOR_REGION (for
 * regional resources) in .env — see .env.example. Run via
 * `npm run data:translate`; `--dry-run` prints the batch plan and character
 * budget without calling the API. Reruns resume: articles whose source hash
 * already exists in the output files are skipped.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Article, ArticleContent } from '../src/lib/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENDPOINT =
  process.env.AZURE_TRANSLATOR_ENDPOINT ?? 'https://api.cognitive.microsofttranslator.com';

const MAX_BATCH_TEXTS = 25;
const MAX_BATCH_CHARS = 8_000;
const BATCH_DELAY_MS = 300;
const MAX_ATTEMPTS = 6;

export type TargetLocale = 'en' | 'ar';

export interface GlossaryTerm {
  ar: string; // authoritative Arabic legal term as it appears in the source
  ckb?: string;
  en?: string;
  note?: string;
}

export interface TranslatedArticle {
  id: string;
  srcHash: string;
  translationStatus: 'machine';
  content: ArticleContent;
}

export interface TranslatedArticleFile {
  generatedAt: string;
  engine: string;
  locale: TargetLocale;
  articles: TranslatedArticle[];
}

/* ---------- pure helpers (unit-tested) ---------- */

export function hashSource(article: Article): string {
  const { title, conditions, penalties } = article.content.ckb;
  return createHash('sha1').update(`${title}\n${conditions}\n${penalties}`).digest('hex');
}

/**
 * Wrap glossary source terms in Azure dynamic-dictionary markup so the
 * approved target rendering is forced. Only terms with a rendering for this
 * target are wrapped.
 */
export function applyGlossaryMarkup(
  text: string,
  terms: GlossaryTerm[],
  target: TargetLocale,
): string {
  let result = text;
  for (const term of terms) {
    const rendering = target === 'en' ? term.en : undefined; // ar keeps the source term as-is
    if (!rendering || !term.ar) continue;
    result = result.replaceAll(
      term.ar,
      `<mstrans:dictionary translation="${rendering}">${term.ar}</mstrans:dictionary>`,
    );
  }
  return result;
}

/** QA: glossary terms whose approved rendering is absent from the output. */
export function missingGlossaryRenderings(
  sourceText: string,
  translatedText: string,
  terms: GlossaryTerm[],
  target: TargetLocale,
): string[] {
  const missing: string[] = [];
  for (const term of terms) {
    const rendering = target === 'en' ? term.en : term.ar;
    if (!rendering || !term.ar) continue;
    if (sourceText.includes(term.ar) && !translatedText.includes(rendering)) {
      missing.push(term.ar);
    }
  }
  return missing;
}

/** Rebuild formattedText from translated fields — mirrors the source shape. */
export function reconstructFormattedText(
  target: TargetLocale,
  articleNumber: number,
  content: Pick<ArticleContent, 'title' | 'conditions' | 'penalties'>,
): string {
  return target === 'en'
    ? `Article ${articleNumber} > ${content.title}; ${content.conditions} > Outcome: ${content.penalties}`
    : `المادة ${articleNumber} > ${content.title}؛ ${content.conditions} > النتيجة: ${content.penalties}`;
}

export interface BatchItem {
  articleIndex: number;
  field: 'title' | 'conditions' | 'penalties';
  text: string;
}

/** Split items into API batches within the text-count and char limits. */
export function chunkIntoBatches(items: BatchItem[]): BatchItem[][] {
  const batches: BatchItem[][] = [];
  let current: BatchItem[] = [];
  let currentChars = 0;
  for (const item of items) {
    if (
      current.length > 0 &&
      (current.length >= MAX_BATCH_TEXTS || currentChars + item.text.length > MAX_BATCH_CHARS)
    ) {
      batches.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(item);
    currentChars += item.text.length;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

/* ---------- Azure API ---------- */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function translateBatch(texts: string[], target: TargetLocale): Promise<string[]> {
  const key = process.env.AZURE_TRANSLATOR_KEY;
  if (!key) throw new Error('AZURE_TRANSLATOR_KEY is not set');
  const url = `${ENDPOINT}/translate?api-version=3.0&from=ckb&to=${target}`;
  const headers: Record<string, string> = {
    'Ocp-Apim-Subscription-Key': key,
    'Content-Type': 'application/json',
  };
  const region = process.env.AZURE_TRANSLATOR_REGION;
  if (region) headers['Ocp-Apim-Subscription-Region'] = region;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(texts.map((text) => ({ Text: text }))),
    });
    if (response.ok) {
      const payload = (await response.json()) as Array<{
        translations: Array<{ text: string; to: string }>;
      }>;
      return payload.map((entry) => entry.translations[0]?.text ?? '');
    }
    if ((response.status === 429 || response.status >= 500) && attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(response.headers.get('Retry-After'));
      const waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000;
      console.warn(
        `  HTTP ${response.status} — retrying in ${waitMs / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})`,
      );
      await sleep(waitMs);
      continue;
    }
    throw new Error(`Azure Translator HTTP ${response.status}: ${await response.text()}`);
  }
  throw new Error('unreachable');
}

/* ---------- pipeline ---------- */

function loadExisting(path: string): Map<string, TranslatedArticle> {
  if (!existsSync(path)) return new Map();
  const file: TranslatedArticleFile = JSON.parse(readFileSync(path, 'utf8'));
  return new Map(file.articles.map((article) => [article.id, article]));
}

function writeOutput(
  path: string,
  locale: TargetLocale,
  articles: Map<string, TranslatedArticle>,
): void {
  const file: TranslatedArticleFile = {
    generatedAt: new Date().toISOString(),
    engine: 'azure-translator-v3',
    locale,
    articles: [...articles.values()],
  };
  writeFileSync(path, JSON.stringify(file, null, 2) + '\n');
}

async function translateLocale(
  articles: Article[],
  terms: GlossaryTerm[],
  target: TargetLocale,
  dryRun: boolean,
): Promise<void> {
  const outPath = join(ROOT, `content/normalized/articles.${target}.json`);
  const existing = loadExisting(outPath);

  const pending = articles.filter(
    (article) => existing.get(article.id)?.srcHash !== hashSource(article),
  );
  const items: BatchItem[] = [];
  pending.forEach((article, index) => {
    for (const field of ['title', 'conditions', 'penalties'] as const) {
      items.push({
        articleIndex: index,
        field,
        text: applyGlossaryMarkup(article.content.ckb[field], terms, target),
      });
    }
  });
  const batches = chunkIntoBatches(items);
  const chars = items.reduce((sum, item) => sum + item.text.length, 0);
  console.log(
    `→ ${target}: ${pending.length} articles to translate (${existing.size ? articles.length - pending.length : 0} cached), ` +
      `${chars.toLocaleString()} chars in ${batches.length} batches`,
  );
  if (dryRun || pending.length === 0) return;

  const drafts = new Map<string, Partial<Record<BatchItem['field'], string>>>();
  let done = 0;
  for (const batch of batches) {
    const translated = await translateBatch(
      batch.map((item) => item.text),
      target,
    );
    batch.forEach((item, i) => {
      const article = pending[item.articleIndex];
      if (!article) return;
      const draft = drafts.get(article.id) ?? {};
      draft[item.field] = translated[i] ?? '';
      drafts.set(article.id, draft);
    });

    // Persist every completed article so interrupted runs resume cleanly.
    for (const [id, draft] of drafts) {
      if (
        draft.title === undefined ||
        draft.conditions === undefined ||
        draft.penalties === undefined
      )
        continue;
      const article = pending.find((a) => a.id === id);
      if (!article) continue;
      const content: ArticleContent = {
        title: draft.title,
        conditions: draft.conditions,
        penalties: draft.penalties,
        formattedText: reconstructFormattedText(target, article.articleNumber, {
          title: draft.title,
          conditions: draft.conditions,
          penalties: draft.penalties,
        }),
      };
      existing.set(id, { id, srcHash: hashSource(article), translationStatus: 'machine', content });
      drafts.delete(id);
    }
    writeOutput(outPath, target, existing);
    done += batch.length;
    process.stdout.write(`  ${target}: ${done}/${items.length} texts\r`);
    await sleep(BATCH_DELAY_MS);
  }
  console.log(`\n✓ ${target}: ${existing.size}/${articles.length} articles → ${outPath}`);

  // Glossary QA report
  const warnings: string[] = [];
  for (const article of articles) {
    const output = existing.get(article.id);
    if (!output) continue;
    const source = `${article.content.ckb.title} ${article.content.ckb.conditions} ${article.content.ckb.penalties}`;
    const translatedText = `${output.content.title} ${output.content.conditions} ${output.content.penalties}`;
    const missing = missingGlossaryRenderings(source, translatedText, terms, target);
    if (missing.length > 0) warnings.push(`${article.id}: ${missing.join(', ')}`);
  }
  if (warnings.length > 0) {
    console.warn(
      `⚠ ${target}: ${warnings.length} articles missing approved glossary renderings (spot-check candidates — Google Cloud Translation is the documented fallback):`,
    );
    for (const warning of warnings.slice(0, 20)) console.warn(`  ${warning}`);
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  if (!dryRun && !process.env.AZURE_TRANSLATOR_KEY) {
    console.error(
      'AZURE_TRANSLATOR_KEY is not set. Create a free F0 Translator resource (see .env.example),\n' +
        'put the key/region in .env at the repo root, then rerun. Use --dry-run to preview the batch plan.',
    );
    process.exit(1);
  }

  const articles: Article[] = JSON.parse(
    readFileSync(join(ROOT, 'content/normalized/articles.ckb.json'), 'utf8'),
  );
  const glossary: { terms: GlossaryTerm[] } = JSON.parse(
    readFileSync(join(ROOT, 'content/glossary/legal-terms.json'), 'utf8'),
  );
  console.log(
    `${articles.length} articles, ${glossary.terms.length} glossary terms${dryRun ? ' (dry run)' : ''}`,
  );

  for (const target of ['en', 'ar'] as const) {
    await translateLocale(articles, glossary.terms, target, dryRun);
  }
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await main();
