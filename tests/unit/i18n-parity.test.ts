import { describe, expect, it } from 'vitest';
import ckb from '../../src/i18n/ckb.json';
import en from '../../src/i18n/en.json';
import ar from '../../src/i18n/ar.json';

// §2.3: the TS Record check catches keys MISSING from en/ar at compile time,
// but not extra/orphaned keys or a key missing from ckb itself. This test
// enforces exact key-set equality across all three locales, in CI.
const dictionaries = { ckb, en, ar } as const;
const locales = Object.keys(dictionaries) as Array<keyof typeof dictionaries>;

describe('i18n key parity', () => {
  it.each(locales.flatMap((a) => locales.filter((b) => b !== a).map((b) => [a, b] as const)))(
    '%s and %s have identical key sets',
    (a, b) => {
      const keysA = Object.keys(dictionaries[a]).sort();
      const keysB = Object.keys(dictionaries[b]).sort();
      expect(keysA).toEqual(keysB);
    },
  );

  it('no locale has empty values', () => {
    for (const locale of locales) {
      for (const [key, value] of Object.entries(dictionaries[locale])) {
        expect(value, `${locale}:${key}`).not.toBe('');
      }
    }
  });

  it('placeholder tokens match across locales', () => {
    const tokensOf = (value: string) => (value.match(/\{[a-zA-Z]+\}/g) ?? []).sort();
    for (const key of Object.keys(ckb) as Array<keyof typeof ckb>) {
      const expected = tokensOf(ckb[key]);
      expect(tokensOf(en[key]), `en:${key}`).toEqual(expected);
      expect(tokensOf(ar[key]), `ar:${key}`).toEqual(expected);
    }
  });
});
