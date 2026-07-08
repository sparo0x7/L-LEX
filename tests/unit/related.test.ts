import { describe, expect, it } from 'vitest';
import { relatedArticles } from '../../src/lib/data.ts';
import type { SearchDoc } from '../../src/lib/search.ts';
import type { PenaltyTag } from '../../src/lib/types.ts';

function doc(n: number, tags: PenaltyTag[]): SearchDoc {
  return {
    id: `iraqi-penal-code-1969-${n}`,
    lawId: 'iraqi-penal-code-1969',
    n,
    tags,
    title: `t${n}`,
    conditions: 'c',
    penalties: 'p',
    status: { ckb: 'source', en: 'missing', ar: 'missing' },
  };
}

describe('relatedArticles heuristic', () => {
  const lawDocs = [
    doc(1, ['fine']),
    doc(2, ['imprisonment']),
    doc(3, ['fine']),
    doc(4, ['detention']),
    doc(10, ['fine']),
    doc(20, ['fine']),
  ];

  it('prefers immediate neighbors, then nearest shared-tag articles', () => {
    const related = relatedArticles(doc(3, ['fine']), lawDocs);
    const numbers = related.map((d) => d.n);
    expect(numbers.slice(0, 2)).toEqual([2, 4]); // neighbors first
    expect(numbers).toContain(1); // shared 'fine' tag, nearest
  });

  it('never includes the article itself and respects the cap', () => {
    const related = relatedArticles(doc(3, ['fine']), lawDocs, 3);
    expect(related.map((d) => d.n)).not.toContain(3);
    expect(related.length).toBeLessThanOrEqual(3);
  });

  it('does not use the other tag for similarity', () => {
    const related = relatedArticles(doc(20, ['other']), lawDocs);
    expect(related.map((d) => d.n)).not.toContain(1); // only neighbor logic applies
  });
});
