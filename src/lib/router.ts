/**
 * Minimal history-API router for the §7 route table, with the locale as an
 * optional URL prefix (§12): ckb is unprefixed, en/ar are /en/… and /ar/….
 * Static hosts need an SPA fallback (public/_redirects) until Phase 7
 * pre-rendering.
 */
import type { Locale } from './types.ts';

export type Route =
  | { name: 'landing' }
  | { name: 'home' } // the search app, at /search
  | { name: 'law'; lawSlug: string }
  | { name: 'article'; lawSlug: string; articleNumber: number }
  | { name: 'favorites' }
  | { name: 'about' }
  | { name: 'notFound' };

export function parseLocation(pathname: string): { locale: Locale; route: Route } {
  const segments = pathname.split('/').filter(Boolean);
  let locale: Locale = 'ckb';
  if (segments[0] === 'en' || segments[0] === 'ar') {
    locale = segments[0];
    segments.shift();
  }

  let route: Route;
  if (segments.length === 0) {
    route = { name: 'landing' };
  } else if (segments.length === 1 && segments[0] === 'search') {
    route = { name: 'home' };
  } else if (segments.length === 1 && segments[0] === 'favorites') {
    route = { name: 'favorites' };
  } else if (segments.length === 1 && segments[0] === 'about') {
    route = { name: 'about' };
  } else if (segments.length === 2 && segments[0] === 'law' && segments[1]) {
    route = { name: 'law', lawSlug: segments[1] };
  } else if (
    segments.length === 4 &&
    segments[0] === 'law' &&
    segments[1] &&
    segments[2] === 'article' &&
    /^\d+$/.test(segments[3] ?? '')
  ) {
    route = { name: 'article', lawSlug: segments[1], articleNumber: Number(segments[3]) };
  } else {
    route = { name: 'notFound' };
  }
  return { locale, route };
}

export function routePath(route: Route, locale: Locale): string {
  const prefix = locale === 'ckb' ? '' : `/${locale}`;
  switch (route.name) {
    case 'landing':
      return prefix || '/';
    case 'home':
      return `${prefix}/search`;
    case 'law':
      return `${prefix}/law/${route.lawSlug}`;
    case 'article':
      return `${prefix}/law/${route.lawSlug}/article/${route.articleNumber}`;
    case 'favorites':
      return `${prefix}/favorites`;
    case 'about':
      return `${prefix}/about`;
    case 'notFound':
      return `${prefix}/404`;
  }
}

type RouteListener = (route: Route) => void;
let listener: RouteListener | null = null;

export function setRouteListener(callback: RouteListener): void {
  listener = callback;
}

export function navigate(route: Route, locale: Locale): void {
  history.pushState(null, '', routePath(route, locale));
  listener?.(route);
}
