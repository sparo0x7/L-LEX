import { describe, expect, it } from 'vitest';
import {
  applyGlossaryMarkup,
  chunkIntoBatches,
  missingGlossaryRenderings,
  reconstructFormattedText,
} from '../../scripts/translate-articles.ts';
import type { BatchItem, GlossaryTerm } from '../../scripts/translate-articles.ts';

const TERMS: GlossaryTerm[] = [
  { ar: 'شرعية الجرائم والعقوبات', en: 'legality of crimes and punishments' },
  { ar: 'التوقيف', en: 'detention' },
  { ar: 'بدون رەندەرینگ' }, // no en rendering — must never be wrapped
];

describe('applyGlossaryMarkup', () => {
  it('wraps glossary terms in dynamic-dictionary markup for en', () => {
    const text = 'بنەمای (شرعية الجرائم والعقوبات) لە یاسادا';
    const marked = applyGlossaryMarkup(text, TERMS, 'en');
    expect(marked).toContain(
      '<mstrans:dictionary translation="legality of crimes and punishments">شرعية الجرائم والعقوبات</mstrans:dictionary>',
    );
  });

  it('leaves ar-target text unmarked (source terms already Arabic)', () => {
    const text = 'بنەمای (شرعية الجرائم والعقوبات)';
    expect(applyGlossaryMarkup(text, TERMS, 'ar')).toBe(text);
  });

  it('ignores terms without a rendering and text without matches', () => {
    expect(applyGlossaryMarkup('بدون رەندەرینگ', TERMS, 'en')).toBe('بدون رەندەرینگ');
    expect(applyGlossaryMarkup('no arabic terms here', TERMS, 'en')).toBe('no arabic terms here');
  });
});

describe('missingGlossaryRenderings', () => {
  it('flags terms present in source but absent from the translation', () => {
    const source = 'دەقێک لەگەڵ (التوقيف)';
    expect(missingGlossaryRenderings(source, 'text about custody', TERMS, 'en')).toEqual([
      'التوقيف',
    ]);
    expect(missingGlossaryRenderings(source, 'text about detention', TERMS, 'en')).toEqual([]);
  });
});

describe('reconstructFormattedText', () => {
  const content = { title: 'T', conditions: 'C', penalties: 'P' };

  it('mirrors the source formattedText shape per target', () => {
    expect(reconstructFormattedText('en', 251, content)).toBe('Article 251 > T; C > Outcome: P');
    expect(reconstructFormattedText('ar', 251, content)).toBe('المادة 251 > T؛ C > النتيجة: P');
  });
});

describe('chunkIntoBatches', () => {
  const item = (chars: number): BatchItem => ({
    articleIndex: 0,
    field: 'title',
    text: 'x'.repeat(chars),
  });

  it('splits on the character budget', () => {
    const batches = chunkIntoBatches([item(5000), item(5000), item(5000)]);
    expect(batches.length).toBe(3); // 5000+5000 > 8000 → one per batch
  });

  it('splits on the text-count budget', () => {
    const batches = chunkIntoBatches(Array.from({ length: 60 }, () => item(10)));
    expect(batches.length).toBe(3); // 25 + 25 + 10
    expect(batches[0]!.length).toBe(25);
  });

  it('never drops or reorders items', () => {
    const items = Array.from({ length: 7 }, (_, i) => ({ ...item(3000), articleIndex: i }));
    const flattened = chunkIntoBatches(items).flat();
    expect(flattened.map((entry) => entry.articleIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});
