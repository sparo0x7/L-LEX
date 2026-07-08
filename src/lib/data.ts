/**
 * Client data access — one cached fetch of the content bundle
 * (content/normalized/search-index.json) shared by search, law pages, and
 * article pages. Law metadata (tiny) is bundled directly.
 */
import type { Law, LawId } from './types.ts';
import type { SearchDoc, SearchIndexFile } from './search.ts';
import lawsJson from '../../content/normalized/laws.json';
import searchIndexUrl from '../../content/normalized/search-index.json?url';

export const LAWS = lawsJson as Law[];

export function lawById(lawId: string): Law | undefined {
  return LAWS.find((law) => law.id === lawId);
}

export interface AppData {
  docs: SearchDoc[];
  byId: Map<string, SearchDoc>;
  byLaw: Map<LawId, SearchDoc[]>;
}

let dataPromise: Promise<AppData> | null = null;

export function loadData(): Promise<AppData> {
  dataPromise ??= fetch(searchIndexUrl)
    .then((response) => response.json() as Promise<SearchIndexFile>)
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
    });
  return dataPromise;
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
