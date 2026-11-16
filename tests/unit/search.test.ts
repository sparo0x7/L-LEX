import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  createSearchEngine,
  highlightMatches,
  makeSnippet,
  normalizeSearchText,
} from '../../src/lib/search.ts';
import type { SearchIndexFile } from '../../src/lib/search.ts';

describe('normalizeSearchText (§6.3)', () => {
  it('converts Eastern Arabic-Indic digits to Western', () => {
    expect(normalizeSearchText('٢٥١')).toBe('251');
    expect(normalizeSearchText('١١١ ساڵی ١٩٦٩')).toBe('111 ساڵی 1969');
  });

  it('converts Persian digits to Western', () => {
    expect(normalizeSearchText('۲۵۱')).toBe('251');
  });

  it('unifies alef forms', () => {
    expect(normalizeSearchText('إأآا')).toBe('اااا');
  });

  it('unifies Arabic yaa and kaf with Kurdish forms', () => {
    expect(normalizeSearchText('علي')).toBe('علی');
    expect(normalizeSearchText('كتاب')).toBe('کتاب');
  });

  it('unifies taa marbuta with haa', () => {
    expect(normalizeSearchText('محكمة')).toBe('محکمه');
  });

  it('strips Arabic diacritics (tashkeel)', () => {
    expect(normalizeSearchText('مُحَمَّد')).toBe('محمد');
  });

  it('lowercases and trims', () => {
    expect(normalizeSearchText('  Penal CODE  ')).toBe('penal code');
  });
});

const indexFile: SearchIndexFile = JSON.parse(
  readFileSync(new URL('../../content/normalized/search-index.json', import.meta.url), 'utf8'),
);
const engine = createSearchEngine(indexFile.docs);

describe('SearchEngine against the real corpus', () => {
  it('indexes all 885 articles', () => {
    expect(engine.size).toBe(885);
  });

  it('DoD: "251" and "٢٥١" return the same article, ranked first', () => {
    const western = engine.search('251');
    const eastern = engine.search('٢٥١');
    expect(western[0]?.doc.id).toBe('iraqi-penal-code-1969-251');
    expect(eastern[0]?.doc.id).toBe('iraqi-penal-code-1969-251');
  });

  it('DoD: a Sorani keyword returns matching articles', () => {
    const results = engine.search('دزی');
    expect(results.length).toBeGreaterThan(0);
    const top = results[0]!.doc;
    const text = `${top.title} ${top.conditions} ${top.penalties}`;
    expect(normalizeSearchText(text)).toContain('دزی');
  });

  it('matches Arabic-script query forms against the indexed text', () => {
    // السرقة appears in the Sorani source only inside Arabic parentheticals;
    // taa-marbuta unification (ة→ه) must not break the match.
    const results = engine.search('السرقة');
    expect(results.length).toBeGreaterThan(0);
  });

  it('law filter restricts results to that law', () => {
    const results = engine.search('سزا', { law: 'kurdistan-internal-security-forces-law' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.doc.lawId === 'kurdistan-internal-security-forces-law')).toBe(
      true,
    );
  });

  it('penalty filter restricts results to that tag', () => {
    const results = engine.search('سزا', { penalty: 'death-penalty' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.doc.tags.includes('death-penalty'))).toBe(true);
  });

  it('sort by number returns ascending article numbers within a law', () => {
    const results = engine.search('زیندانی', { law: 'iraqi-penal-code-1969', sort: 'number' });
    const numbers = results.map((r) => r.doc.n);
    expect([...numbers].sort((a, b) => a - b)).toEqual(numbers);
  });

  it('empty and whitespace-only queries return no results', () => {
    expect(engine.search('')).toEqual([]);
    expect(engine.search('   ')).toEqual([]);
  });
});

describe('SearchEngine.browse (filter-only browsing, §3)', () => {
  it('browses a whole law in article-number order', () => {
    const results = engine.browse({ law: 'kurdistan-internal-security-forces-law' });
    expect(results.length).toBe(90);
    expect(results.map((r) => r.doc.n)).toEqual(Array.from({ length: 90 }, (_, i) => i + 1));
  });

  it('browses by penalty tag across both laws', () => {
    const results = engine.browse({ penalty: 'death-penalty' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.doc.tags.includes('death-penalty'))).toBe(true);
  });

  it('combines law and penalty filters', () => {
    const results = engine.browse({
      law: 'kurdistan-internal-security-forces-law',
      penalty: 'dismissal',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (r) =>
          r.doc.lawId === 'kurdistan-internal-security-forces-law' &&
          r.doc.tags.includes('dismissal'),
      ),
    ).toBe(true);
  });

  it('with no filters browses the entire corpus', () => {
    expect(engine.browse({}).length).toBe(885);
  });
});

describe('locale-aware search index', () => {
  it('indexes translated English fields only for articles with EN content', () => {
    const translated = indexFile.docs.filter((doc) => doc.titleEn);
    const missing = indexFile.docs.find((doc) => doc.status.en === 'missing');
    expect(translated.length).toBe(302);
    expect(missing?.titleEn).toBeUndefined();
    expect(missing?.conditionsEn).toBeUndefined();
    expect(missing?.penaltiesEn).toBeUndefined();
  });

  it('indexes translated Arabic fields only for articles with AR content', () => {
    const translated = indexFile.docs.filter((doc) => doc.titleAr);
    const missing = indexFile.docs.find((doc) => doc.status.ar === 'missing');
    expect(translated.length).toBe(302);
    expect(missing?.titleAr).toBeUndefined();
    expect(missing?.conditionsAr).toBeUndefined();
    expect(missing?.penaltiesAr).toBeUndefined();
  });

  it('finds English-translated articles by English keywords', () => {
    const results = engine.search('legality');
    expect(
      results.some(
        (result) =>
          result.doc.id === 'iraqi-penal-code-1969-1' &&
          normalizeSearchText(result.doc.titleEn ?? '').includes('legality'),
      ),
    ).toBe(true);
  });

  it('finds Arabic-translated articles by Arabic keywords', () => {
    const results = engine.search('العقوبات');
    expect(
      results.some((result) =>
        normalizeSearchText(result.doc.titleAr ?? '').includes(normalizeSearchText('العقوبات')),
      ),
    ).toBe(true);
  });
});

describe('display helpers', () => {
  it('highlightMatches wraps matching tokens in <mark> across scripts', () => {
    const html = highlightMatches('سزای دزی و غەرامە', 'دزی');
    expect(html).toContain('<mark>دزی</mark>');
    expect(html).not.toContain('<mark>غەرامە</mark>');
  });

  it('highlightMatches escapes HTML', () => {
    expect(highlightMatches('<b>x</b>', 'zzz')).toBe('&lt;b&gt;x&lt;/b&gt;');
  });

  it('makeSnippet returns short text unchanged', () => {
    expect(makeSnippet('کورتە', 'دزی')).toBe('کورتە');
  });

  it('makeSnippet windows around the first match in long text', () => {
    const text = `${'پێشەکی '.repeat(60)}دزی ${'دواتر '.repeat(60)}`;
    const snippet = makeSnippet(text, 'دزی');
    expect(snippet).toContain('دزی');
    expect(snippet.length).toBeLessThan(text.length);
  });
});
