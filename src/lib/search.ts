/**
 * Search core — CLAUDE.md §6.3 (text normalization) and §10 (behavior).
 *
 * `normalizeSearchText` is applied to BOTH the indexed content and the live
 * query, so "٢٥١", "۲۵۱", and "251" all hit the same article, and Arabic
 * letter-forms (ي/ك/ة) match their Kurdish counterparts (ی/ک/ه). Stored
 * article text is never modified — normalization happens only at match time.
 */
import { Document as FlexDocument, Encoder } from 'flexsearch';
import type { LawId, Locale, PenaltyTag, TranslationStatus } from './types.ts';

export function normalizeSearchText(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[ً-ٰٟ]/g, '') // strip Arabic diacritics (tashkeel)
    .replace(/[إأآا]/g, 'ا') // unify alef forms
    .replace(/[يى]/g, 'ی') // unify yaa (Arabic ي vs Kurdish/Persian ی)
    .replace(/ك/g, 'ک') // unify kaf (Arabic ك vs Kurdish/Persian ک)
    .replace(/ة/g, 'ه') // unify taa marbuta / haa
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))) // Eastern Arabic-Indic digits → Western
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))) // Persian digits → Western
    .toLowerCase()
    .trim();
}

/** One searchable article — the compact shape stored in search-index.json.
 * (Type alias, not interface: FlexSearch's DocumentData needs an implicit
 * index signature, which only aliases satisfy.) */
export type SearchDoc = {
  id: string;
  lawId: LawId;
  n: number; // article number
  tags: PenaltyTag[];
  title: string;
  conditions: string;
  penalties: string;
  // Per-locale translation state. UI branching MUST use this, never
  // content-string emptiness (CLAUDE.md §6.2 graceful degradation).
  status: Record<Locale, TranslationStatus>;
};

export interface SearchIndexFile {
  generatedAt: string;
  count: number;
  docs: SearchDoc[];
}

export type SearchSort = 'relevance' | 'number';

export interface SearchFilters {
  law?: LawId | '';
  penalty?: PenaltyTag | '';
  sort?: SearchSort;
  limit?: number;
}

export interface SearchResult {
  doc: SearchDoc;
  score: number;
}

type TextField = 'title' | 'conditions' | 'penalties';
const FIELD_WEIGHTS: Record<TextField, number> = { title: 3, penalties: 2, conditions: 1 };
const NUMBER_EXACT_BOOST = 100;
const NUMBER_PREFIX_BOOST = 5;
const DEFAULT_LIMIT = 50;

export class SearchEngine {
  private docs = new Map<string, SearchDoc>();
  private index = new FlexDocument<SearchDoc>({
    tokenize: 'forward', // prefix matching for search-as-you-type
    encoder: new Encoder({
      normalize: normalizeSearchText,
      split: /[^\p{L}\p{N}]+/u, // token boundary: anything that isn't a letter or digit
    }),
    document: {
      id: 'id',
      index: ['title', 'conditions', 'penalties'],
    },
  });

  add(docs: SearchDoc[]): void {
    for (const doc of docs) {
      this.docs.set(doc.id, doc);
      this.index.add(doc);
    }
  }

  get size(): number {
    return this.docs.size;
  }

  getDoc(id: string): SearchDoc | undefined {
    return this.docs.get(id);
  }

  search(rawQuery: string, filters: SearchFilters = {}): SearchResult[] {
    const query = normalizeSearchText(rawQuery);
    if (!query) return [];

    const scores = new Map<string, number>();
    const bump = (id: string, amount: number) => scores.set(id, (scores.get(id) ?? 0) + amount);

    // Article-number matching (exact first, then prefix), independent of text hits.
    if (/^\d+$/.test(query)) {
      for (const doc of this.docs.values()) {
        if (doc.n === Number(query)) bump(doc.id, NUMBER_EXACT_BOOST);
        else if (String(doc.n).startsWith(query)) bump(doc.id, NUMBER_PREFIX_BOOST);
      }
    }

    // Field-weighted text matching; earlier positions in a field's result list
    // score higher within that field.
    const fieldResults = this.index.search(query, { limit: 200 }) as Array<{
      field?: string;
      result: Array<string | number>;
    }>;
    for (const { field, result } of fieldResults) {
      const weight = FIELD_WEIGHTS[field as TextField] ?? 1;
      result.forEach((id, position) => {
        bump(String(id), weight * ((result.length - position) / result.length));
      });
    }

    const { law = '', penalty = '', sort = 'relevance', limit = DEFAULT_LIMIT } = filters;
    const results: SearchResult[] = [];
    for (const [id, score] of scores) {
      const doc = this.docs.get(id);
      if (!doc) continue;
      if (law && doc.lawId !== law) continue;
      if (penalty && !doc.tags.includes(penalty)) continue;
      results.push({ doc, score });
    }

    results.sort((a, b) =>
      sort === 'number'
        ? a.doc.lawId.localeCompare(b.doc.lawId) || a.doc.n - b.doc.n
        : b.score - a.score || a.doc.n - b.doc.n,
    );
    return results.slice(0, limit);
  }
}

export function createSearchEngine(docs: SearchDoc[]): SearchEngine {
  const engine = new SearchEngine();
  engine.add(docs);
  return engine;
}

/* ---------- display helpers (snippets + highlighting) ---------- */

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function queryTerms(rawQuery: string): string[] {
  return normalizeSearchText(rawQuery)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length >= 2 || /^\d+$/.test(term));
}

function tokenMatches(token: string, terms: string[]): boolean {
  const normalized = normalizeSearchText(token);
  return terms.some((term) => normalized.includes(term));
}

/**
 * HTML-escape `text` and wrap tokens matching the query in <mark>. Matching is
 * done on normalized forms so an Arabic-script query highlights Kurdish text.
 */
export function highlightMatches(text: string, rawQuery: string): string {
  const terms = queryTerms(rawQuery);
  if (terms.length === 0) return escapeHtml(text);
  return text
    .split(/(\s+)/)
    .map((part) =>
      /\S/.test(part) && tokenMatches(part, terms)
        ? `<mark>${escapeHtml(part)}</mark>`
        : escapeHtml(part),
    )
    .join('');
}

/** A window of `text` around the first query match (whole text if it fits). */
export function makeSnippet(text: string, rawQuery: string, windowSize = 180): string {
  if (text.length <= windowSize) return text;
  const terms = queryTerms(rawQuery);
  const words = text.split(/\s+/);
  const hit = terms.length > 0 ? words.findIndex((word) => tokenMatches(word, terms)) : -1;
  if (hit === -1) return `${text.slice(0, windowSize)}…`;

  let start = hit;
  let length = words[hit]?.length ?? 0;
  while (start > 0 && length < windowSize / 2) {
    start--;
    length += (words[start]?.length ?? 0) + 1;
  }
  let end = hit;
  while (end < words.length - 1 && length < windowSize) {
    end++;
    length += (words[end]?.length ?? 0) + 1;
  }
  const prefix = start > 0 ? '…' : '';
  const suffix = end < words.length - 1 ? '…' : '';
  return `${prefix}${words.slice(start, end + 1).join(' ')}${suffix}`;
}
