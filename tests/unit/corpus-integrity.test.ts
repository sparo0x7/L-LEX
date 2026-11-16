import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Article, Law, Locale } from '../../src/lib/types.ts';
import type { LocaleContentFile, SearchIndexFile } from '../../src/lib/search.ts';
import type { TranslatedArticleFile } from '../../scripts/translate-articles.ts';
import { hashSource } from '../../scripts/translate-articles.ts';
import { lawBySlug, lawSlugById } from '../../src/lib/data.ts';
import { LAW_IDS } from '../../src/components/search/Filters.ts';

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')) as T;

const laws = readJson<Law[]>('content/normalized/laws.json');
const articles = readJson<Article[]>('content/normalized/articles.ckb.json');
const translated: Record<'en' | 'ar', TranslatedArticleFile> = {
  en: readJson<TranslatedArticleFile>('content/normalized/articles.en.json'),
  ar: readJson<TranslatedArticleFile>('content/normalized/articles.ar.json'),
};
const content: Record<'en' | 'ar', LocaleContentFile> = {
  en: readJson<LocaleContentFile>('content/normalized/content.en.json'),
  ar: readJson<LocaleContentFile>('content/normalized/content.ar.json'),
};
const index = readJson<SearchIndexFile>('content/normalized/search-index.json');

const lawByLawId = new Map(laws.map((law) => [law.id, law]));
const articleById = new Map(articles.map((article) => [article.id, article]));
const LOCALES: Locale[] = ['ckb', 'en', 'ar'];

describe('normalized legal corpus integrity', () => {
  it('has the expected 11-law / 885-article corpus', () => {
    expect(laws).toHaveLength(11);
    expect(articles).toHaveLength(885);
    expect(index.count).toBe(885);
    expect(index.docs).toHaveLength(885);
  });

  it('has unique article ids in `${lawId}-${articleNumber}` form', () => {
    const ids = new Set<string>();
    for (const article of articles) {
      expect(article.id).toBe(`${article.lawId}-${article.articleNumber}`);
      expect(ids.has(article.id)).toBe(false);
      ids.add(article.id);
    }
  });

  it('keeps every article attached to a known law with matching counts', () => {
    const counts = new Map<string, number>();
    for (const article of articles) {
      expect(lawByLawId.has(article.lawId)).toBe(true);
      counts.set(article.lawId, (counts.get(article.lawId) ?? 0) + 1);
    }
    for (const law of laws) {
      expect(counts.get(law.id)).toBe(law.articleCount);
      expect(law.articleCount).toBeLessThanOrEqual(law.totalArticleCount ?? law.articleCount);
    }
    expect(lawByLawId.get('kri-reform-law-2020-peshmerga')?.totalArticleCount).toBe(19);
  });

  it('exposes unique law slugs that resolve back to the same law', () => {
    const slugs = new Set<string>();
    for (const law of laws) {
      expect(slugs.has(law.slug)).toBe(false);
      slugs.add(law.slug);
      expect(lawBySlug(law.slug)?.id).toBe(law.id);
      expect(lawSlugById(law.id)).toBe(law.slug);
    }
    for (const lawId of LAW_IDS) expect(lawByLawId.has(lawId)).toBe(true);
  });

  it('does not mark any translation reviewed without recorded human review', () => {
    for (const article of articles) {
      for (const locale of ['en', 'ar'] as const) {
        expect(article.translationStatus[locale]).not.toBe('reviewed');
      }
    }
    for (const locale of ['en', 'ar'] as const) {
      for (const entry of translated[locale].articles) {
        expect(entry.translationStatus).not.toBe('reviewed');
        expect(articleById.has(entry.id)).toBe(true);
      }
      for (const entry of Object.values(content[locale].articles)) {
        expect(entry.status).not.toBe('reviewed');
      }
    }
    for (const doc of index.docs) {
      for (const locale of LOCALES) expect(doc.status[locale]).not.toBe('reviewed');
    }
  });

  it('keeps translated ids, hashes, and content files consistent', () => {
    for (const locale of ['en', 'ar'] as const) {
      const file = translated[locale];
      const contentFile = content[locale];
      expect(file.locale).toBe(locale);
      expect(contentFile.locale).toBe(locale);

      const translatedIds = new Set(file.articles.map((entry) => entry.id));
      expect(new Set(Object.keys(contentFile.articles))).toEqual(translatedIds);

      for (const entry of file.articles) {
        const article = articleById.get(entry.id);
        expect(article).toBeDefined();
        expect(entry.srcHash).toBe(hashSource(article!));
        const projected = contentFile.articles[entry.id];
        expect(projected?.title).toBe(entry.content.title);
        expect(projected?.conditions).toBe(entry.content.conditions);
        expect(projected?.penalties).toBe(entry.content.penalties);
        expect(projected?.status).toBe(entry.translationStatus);
      }
    }
  });

  it('matches search-index docs to normalized articles and translation status', () => {
    const contentByLocale = {
      en: new Map(Object.entries(content.en.articles)),
      ar: new Map(Object.entries(content.ar.articles)),
    };

    expect(index.docs.map((doc) => doc.id).sort()).toEqual(articles.map((a) => a.id).sort());
    for (const doc of index.docs) {
      const article = articleById.get(doc.id);
      expect(article).toBeDefined();
      expect(doc.lawId).toBe(article!.lawId);
      expect(doc.n).toBe(article!.articleNumber);
      expect(doc.tags).toEqual(article!.penaltyTags);
      expect(doc.title).toBe(article!.content.ckb.title);
      expect(doc.conditions).toBe(article!.content.ckb.conditions);
      expect(doc.penalties).toBe(article!.content.ckb.penalties);
      expect(doc.status.ckb).toBe('source');
      for (const locale of ['en', 'ar'] as const) {
        const translatedStatus = contentByLocale[locale].get(doc.id)?.status;
        expect(doc.status[locale]).toBe(translatedStatus ?? article!.translationStatus[locale]);
      }
    }
  });
});
