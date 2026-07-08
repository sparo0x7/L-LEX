import { describe, expect, it } from 'vitest';
import { parseLocation, routePath } from '../../src/lib/router.ts';
import type { Route } from '../../src/lib/router.ts';
import type { Locale } from '../../src/lib/types.ts';

describe('parseLocation', () => {
  it('parses the unprefixed root as ckb home', () => {
    expect(parseLocation('/')).toEqual({ locale: 'ckb', route: { name: 'home' } });
  });

  it('parses locale prefixes', () => {
    expect(parseLocation('/en/').locale).toBe('en');
    expect(parseLocation('/ar/favorites')).toEqual({
      locale: 'ar',
      route: { name: 'favorites' },
    });
  });

  it('parses law and article routes', () => {
    expect(parseLocation('/law/iraqi-penal-code-1969')).toEqual({
      locale: 'ckb',
      route: { name: 'law', lawSlug: 'iraqi-penal-code-1969' },
    });
    expect(parseLocation('/en/law/iraqi-penal-code-1969/article/251')).toEqual({
      locale: 'en',
      route: { name: 'article', lawSlug: 'iraqi-penal-code-1969', articleNumber: 251 },
    });
  });

  it('treats /search as the home (search) page', () => {
    expect(parseLocation('/search').route).toEqual({ name: 'home' });
  });

  it('returns notFound for unknown or malformed paths', () => {
    expect(parseLocation('/nope').route).toEqual({ name: 'notFound' });
    expect(parseLocation('/law/x/article/abc').route).toEqual({ name: 'notFound' });
    expect(parseLocation('/law/x/article/').route).toEqual({ name: 'notFound' });
  });

  it('round-trips every route through routePath in every locale', () => {
    const routes: Route[] = [
      { name: 'home' },
      { name: 'law', lawSlug: 'iraqi-penal-code-1969' },
      { name: 'article', lawSlug: 'kurdistan-internal-security-forces-law', articleNumber: 45 },
      { name: 'favorites' },
      { name: 'about' },
    ];
    const locales: Locale[] = ['ckb', 'en', 'ar'];
    for (const route of routes) {
      for (const locale of locales) {
        const parsed = parseLocation(routePath(route, locale));
        expect(parsed.locale).toBe(locale);
        expect(parsed.route).toEqual(route);
      }
    }
  });
});
