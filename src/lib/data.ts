/**
 * Client data access — one cached fetch of the content bundle
 * (content/normalized/search-index.json) shared by search, law pages, and
 * article pages. Law metadata (tiny) is bundled directly.
 */
import type { Law, LawId, Locale } from './types.ts';
import type {
  LocaleArticleContent,
  LocaleContentFile,
  SearchDoc,
  SearchIndexFile,
} from './search.ts';
import lawsJson from '../../content/normalized/laws.json';
import searchIndexUrl from '../../content/normalized/search-index.json?url';
import contentEnUrl from '../../content/normalized/content.en.json?url';
import contentArUrl from '../../content/normalized/content.ar.json?url';

export const LAWS = lawsJson as Law[];

export function lawBySlug(slug: string): Law | undefined {
  return LAWS.find((law) => law.slug === slug);
}

export function lawSlugById(lawId: string): string | undefined {
  return LAWS.find((law) => law.id === lawId)?.slug;
}

export interface AppData {
  docs: SearchDoc[];
  byId: Map<string, SearchDoc>;
  byLaw: Map<LawId, SearchDoc[]>;
}

let dataPromise: Promise<AppData> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
  return (await response.json()) as T;
}

export function loadData(): Promise<AppData> {
  dataPromise ??= fetchJson<SearchIndexFile>(searchIndexUrl)
    .then((file) => {
      const byId = new Map<string, SearchDoc>();
      const byLaw = new Map<LawId, SearchDoc[]>();
      for (const doc of file.docs) {
        byId.set(doc.id, doc);
        const list = byLaw.get(doc.lawId);
        if (list) list.push(doc);
        else byLaw.set(doc.lawId, [doc]);
      }
      for (const list of byLaw.values()) list.sort((a, b) => a.n - b.n);
      return { docs: file.docs, byId, byLaw };
    })
    .catch((error: unknown) => {
      dataPromise = null; // allow retry instead of caching a permanent failure
      throw error;
    });
  return dataPromise;
}

const CONTENT_URLS: Partial<Record<Locale, string>> = { en: contentEnUrl, ar: contentArUrl };
const contentPromises = new Map<Locale, Promise<LocaleContentFile>>();

/**
 * Translated article content for en/ar (Phase 6 output), fetched lazily and
 * cached. Returns null for ckb (the source locale) or when the article has no
 * translation yet — callers then fall back to the Sorani source per §6.2.
 */
export async function loadTranslatedContent(
  articleId: string,
  locale: Locale,
): Promise<LocaleArticleContent | null> {
  const url = CONTENT_URLS[locale];
  if (!url) return null;
  let promise = contentPromises.get(locale);
  if (!promise) {
    promise = fetchJson<LocaleContentFile>(url).catch((error: unknown) => {
      contentPromises.delete(locale); // allow retry instead of caching a permanent failure
      throw error;
    });
    contentPromises.set(locale, promise);
  }
  const file = await promise;
  return file.articles[articleId] ?? null;
}

/**
 * Related-articles heuristic (CLAUDE.md §11 v1): same law — immediate
 * neighbors by article number, then nearest articles sharing the first
 * penalty tag. Capped at `limit`, excluding the article itself.
 */
export function relatedArticles(doc: SearchDoc, lawDocs: SearchDoc[], limit = 4): SearchDoc[] {
  const related: SearchDoc[] = [];
  const seen = new Set<string>([doc.id]);
  const push = (candidate: SearchDoc | undefined) => {
    if (candidate && !seen.has(candidate.id) && related.length < limit) {
      seen.add(candidate.id);
      related.push(candidate);
    }
  };

  const byNumber = new Map(lawDocs.map((d) => [d.n, d]));
  push(byNumber.get(doc.n - 1));
  push(byNumber.get(doc.n + 1));

  const primaryTag = doc.tags[0];
  if (primaryTag && primaryTag !== 'other') {
    const sharing = lawDocs
      .filter((d) => d.tags.includes(primaryTag))
      .sort((a, b) => Math.abs(a.n - doc.n) - Math.abs(b.n - doc.n));
    for (const candidate of sharing) push(candidate);
  }
  return related;
}
