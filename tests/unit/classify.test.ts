import { describe, expect, it } from 'vitest';
import { classifyPenalties } from '../../scripts/classify-penalties.ts';

describe('classifyPenalties (corpus-refined patterns)', () => {
  it('tags سێدارە and إعدام as death-penalty', () => {
    expect(classifyPenalties('سزای لەسێدارەدان (الإعدام)')).toContain('death-penalty');
  });

  it('real security art. 3 phrasing: death + life imprisonment', () => {
    const tags = classifyPenalties('سزای لەسێدارەدان (الإعدام) یان زیندانی هەمیشەیی (المؤبد)');
    expect(tags).toContain('death-penalty');
    expect(tags).toContain('life-imprisonment');
  });

  it('tags زیندانی کاتی as imprisonment', () => {
    expect(classifyPenalties('سەپاندنی سزای زیندانی کاتی تا ١٥ ساڵ')).toContain('imprisonment');
  });

  it('pure life imprisonment is not also tagged imprisonment', () => {
    const tags = classifyPenalties('سزای زیندانی هەمیشەیی');
    expect(tags).toContain('life-imprisonment');
    expect(tags).not.toContain('imprisonment');
  });

  it('real penal art. 204 phrasing: حەبس → detention, زەوتکردن → confiscation', () => {
    const tags = classifyPenalties('سزای حەبس تا ٣ ساڵ لەگەڵ زەوتکردنی کەرەستەکان');
    expect(tags).toContain('detention');
    expect(tags).toContain('confiscation');
  });

  it('دەرکردن as "issuing a verdict" is NOT dismissal', () => {
    expect(classifyPenalties('دەرکردنی حوکمی سزایی بەسەر تۆمەتباردا')).toEqual(['other']);
  });

  it('دەرکردن anchored to service context IS dismissal', () => {
    expect(classifyPenalties('لەگەڵ دەرکردن لە خزمەتی گشتی')).toContain('dismissal');
    expect(classifyPenalties('دەرکردنی یەکجاری لە ڕیزەکانی هێزەکان')).toContain('dismissal');
  });

  it('tags غەرامە as fine', () => {
    expect(classifyPenalties('غەرامەیەکی دارایی گەورە')).toContain('fine');
  });

  it('falls back to other only when nothing matched', () => {
    expect(classifyPenalties('ڕوونکردنەوەی پێناسە یاساییەکان')).toEqual(['other']);
  });
});
