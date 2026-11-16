/**
 * Translation pipeline — CLAUDE.md §6.2 step 3 (local-engine redesign,
 * 2026-07-08, superseding the Azure Translator draft the same day).
 *
 * Engine: Meta NLLB-200 (distilled 600M) running FULLY LOCALLY via
 * @huggingface/transformers (ONNX, CPU). No API, no key, no per-character
 * cost — the model (~1 GB) downloads once from the Hugging Face Hub and is
 * cached in .cache/transformers/. NLLB-200 explicitly supports Central
 * Kurdish (ckb_Arab) → English (eng_Latn) and Arabic (arb_Arab).
 *
 * Only `title`, `conditions`, and `penalties` are translated; `formattedText`
 * is reconstructed from the translated fields. Long fields are split into
 * sentence chunks (NLLB degrades past ~512 tokens) and rejoined.
 *
 * Glossary (§6.2): NLLB has no term-forcing mechanism, so the glossary is
 * enforced as a post-run QA report — articles where an approved rendering is
 * missing are listed as manual spot-check candidates.
 *
 * A local open model is weaker than commercial engines: output keeps
 * translationStatus 'machine', the UI badge stays, and the §15 human-review
 * requirement is unchanged (if anything, more important).
 *
 * Usage:
 *   npm run data:translate               # full run (resumes automatically)
 *   npm run data:translate -- --dry-run  # chunk/char plan, no model load
 *   npm run data:translate -- --sample 3 # first N articles only (benchmark)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Article, ArticleContent } from '../src/lib/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL_ID = 'Xenova/nllb-200-distilled-600M';
const MAX_CHUNK_CHARS = 400;
const GENERATION_BATCH = 8;

export type TargetLocale = 'en' | 'ar';

const NLLB_CODES: Record<'ckb' | TargetLocale, string> = {
  ckb: 'ckb_Arab',
  en: 'eng_Latn',
  ar: 'arb_Arab',
};

export interface GlossaryTerm {
  ar: string; // authoritative Arabic legal term as it appears in the source
  ckb?: string;
  en?: string;
  note?: string;
}

export interface TranslatedArticle {
  id: string;
  srcHash: string;
  translationStatus: 'machine' | 'reviewed';
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
 * Split text into translation chunks on sentence boundaries (Arabic-script
 * and Latin terminators), merging sentences up to the char budget. Never
 * splits mid-sentence unless a single sentence exceeds the budget.
 */
export function splitIntoChunks(text: string, maxChars = MAX_CHUNK_CHARS): string[] {
  const sentences = text.split(/(?<=[.!?؟؛])\s+/).filter((s) => s.length > 0);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > maxChars) {
      chunks.push(current);
      current = '';
    }
    if (sentence.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      // Oversized sentence: fall back to comma/space boundaries.
      let rest = sentence;
      while (rest.length > maxChars) {
        const slice = rest.slice(0, maxChars);
        const cut = Math.max(
          slice.lastIndexOf('،'),
          slice.lastIndexOf(','),
          slice.lastIndexOf(' '),
        );
        const at = cut > maxChars / 2 ? cut + 1 : maxChars;
        chunks.push(rest.slice(0, at).trim());
        rest = rest.slice(at).trim();
      }
      if (rest) current = rest;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
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

/* ---------- local NLLB engine ---------- */

type Translator = (texts: string[], target: TargetLocale) => Promise<string[]>;

async function createLocalTranslator(): Promise<Translator> {
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = join(ROOT, '.cache/transformers');
  console.log(`loading ${MODEL_ID} (first run downloads ~1 GB to .cache/transformers/)…`);
  const started = Date.now();
  const translate = await pipeline('translation', MODEL_ID);
  console.log(`model ready in ${Math.round((Date.now() - started) / 1000)}s`);

  return async (texts, target) => {
    const results: string[] = [];
    for (let i = 0; i < texts.length; i += GENERATION_BATCH) {
      const batch = texts.slice(i, i + GENERATION_BATCH);
      const output = (await translate(batch, {
        src_lang: NLLB_CODES.ckb,
        tgt_lang: NLLB_CODES[target],
      } as Record<string, unknown>)) as
        Array<{ translation_text: string }> | { translation_text: string };
      const entries = Array.isArray(output) ? output : [output];
      results.push(...entries.map((entry) => entry.translation_text ?? ''));
    }
    return results;
  };
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
    engine: `nllb-200-distilled-600M (local)`,
    locale,
    articles: [...articles.values()],
  };
  writeFileSync(path, JSON.stringify(file, null, 2) + '\n');
}

async function translateLocale(
  translator: Translator | null,
  articles: Article[],
  terms: GlossaryTerm[],
  target: TargetLocale,
): Promise<void> {
  const outPath = join(ROOT, `content/normalized/articles.${target}.json`);
  const existing = loadExisting(outPath);
  const pending = articles.filter(
    (article) => existing.get(article.id)?.srcHash !== hashSource(article),
  );

  const chunkCount = pending.reduce(
    (sum, a) =>
      sum +
      splitIntoChunks(a.content.ckb.title).length +
      splitIntoChunks(a.content.ckb.conditions).length +
      splitIntoChunks(a.content.ckb.penalties).length,
    0,
  );
  const chars = pending.reduce(
    (sum, a) =>
      sum +
      a.content.ckb.title.length +
      a.content.ckb.conditions.length +
      a.content.ckb.penalties.length,
    0,
  );
  console.log(
    `→ ${target}: ${pending.length}/${articles.length} articles pending ` +
      `(${chars.toLocaleString()} chars, ${chunkCount} chunks)`,
  );
  if (!translator || pending.length === 0) return;

  const startedAt = Date.now();
  let processedChars = 0;
  for (const [index, article] of pending.entries()) {
    const content: Partial<ArticleContent> = {};
    for (const field of ['title', 'conditions', 'penalties'] as const) {
      const source = article.content.ckb[field];
      const chunks = splitIntoChunks(source);
      const translated = await translator(chunks, target);
      content[field] = translated.join(' ').trim();
      processedChars += source.length;
    }
    const full: ArticleContent = {
      title: content.title ?? '',
      conditions: content.conditions ?? '',
      penalties: content.penalties ?? '',
      formattedText: reconstructFormattedText(target, article.articleNumber, {
        title: content.title ?? '',
        conditions: content.conditions ?? '',
        penalties: content.penalties ?? '',
      }),
    };
    existing.set(article.id, {
      id: article.id,
      srcHash: hashSource(article),
      translationStatus: 'machine',
      content: full,
    });
    writeOutput(outPath, target, existing);

    const elapsed = (Date.now() - startedAt) / 1000;
    const rate = processedChars / elapsed;
    const remaining = Math.round((chars - processedChars) / rate);
    console.log(
      `  ${target} ${index + 1}/${pending.length} (${article.id}) — ` +
        `${Math.round(rate)} chars/s, ~${Math.round(remaining / 60)}min left`,
    );
  }
  console.log(`✓ ${target}: ${existing.size}/${articles.length} articles → ${outPath}`);

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
      `⚠ ${target}: ${warnings.length} articles missing approved glossary renderings (manual spot-check candidates):`,
    );
    for (const warning of warnings.slice(0, 20)) console.warn(`  ${warning}`);
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const sampleFlag = process.argv.indexOf('--sample');
  const sampleSize = sampleFlag !== -1 ? Number(process.argv[sampleFlag + 1]) || 3 : 0;

  let articles: Article[] = JSON.parse(
    readFileSync(join(ROOT, 'content/normalized/articles.ckb.json'), 'utf8'),
  );
  if (sampleSize > 0) articles = articles.slice(0, sampleSize);
  const glossary: { terms: GlossaryTerm[] } = JSON.parse(
    readFileSync(join(ROOT, 'content/glossary/legal-terms.json'), 'utf8'),
  );
  console.log(
    `${articles.length} articles, ${glossary.terms.length} glossary terms` +
      `${dryRun ? ' (dry run)' : ''}${sampleSize ? ` (sample of ${sampleSize})` : ''}`,
  );

  const translator = dryRun ? null : await createLocalTranslator();
  for (const target of ['en', 'ar'] as const) {
    await translateLocale(translator, articles, glossary.terms, target);
  }
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await main();
