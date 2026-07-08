import { describe, expect, it } from 'vitest';
import {
  missingGlossaryRenderings,
  reconstructFormattedText,
  splitIntoChunks,
} from '../../scripts/translate-articles.ts';
import type { GlossaryTerm } from '../../scripts/translate-articles.ts';

const TERMS: GlossaryTerm[] = [
  { ar: 'شرعية الجرائم والعقوبات', en: 'legality of crimes and punishments' },
  { ar: 'التوقيف', en: 'detention' },
  { ar: 'بدون رەندەرینگ' }, // no en rendering — never reported
];

describe('splitIntoChunks', () => {
  it('keeps short text as a single chunk', () => {
    expect(splitIntoChunks('دەقێکی کورت.')).toEqual(['دەقێکی کورت.']);
  });

  it('splits on Arabic-script sentence boundaries within the budget', () => {
    const a = 'یەکەم ڕستە'.repeat(15) + '؟';
    const b = 'دووەم ڕستە'.repeat(15) + '.';
    const chunks = splitIntoChunks(`${a} ${b}`, 200);
    expect(chunks).toEqual([a, b]);
  });

  it('merges small sentences up to the budget', () => {
    const chunks = splitIntoChunks('یەک. دوو. سێ.', 400);
    expect(chunks).toEqual(['یەک. دوو. سێ.']);
  });

  it('falls back to comma/space cuts for one oversized sentence', () => {
    const long = Array.from({ length: 40 }, (_, i) => `وشە${i}`).join('، ');
    const chunks = splitIntoChunks(long, 100);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 100)).toBe(true);
    // nothing lost apart from whitespace/delimiters at cut points
    expect(chunks.join(' ').replaceAll(' ', '')).toBe(long.replaceAll(' ', ''));
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

  it('ignores terms without a rendering for the target', () => {
    expect(missingGlossaryRenderings('بدون رەندەرینگ', 'anything', TERMS, 'en')).toEqual([]);
  });
});

describe('reconstructFormattedText', () => {
  const content = { title: 'T', conditions: 'C', penalties: 'P' };

  it('mirrors the source formattedText shape per target', () => {
    expect(reconstructFormattedText('en', 251, content)).toBe('Article 251 > T; C > Outcome: P');
    expect(reconstructFormattedText('ar', 251, content)).toBe('المادة 251 > T؛ C > النتيجة: P');
  });
});
