import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Article, Law, Locale } from '../src/lib/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = (process.env.SITE_URL ?? 'https://l-lex.vercel.app').replace(/\/+$/, '');
const LOCALES: Locale[] = ['ckb', 'ar', 'en'];

function localePath(path: string, locale: Locale): string {
  if (locale === 'ckb') return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

function alternates(path: string): string {
  const links = LOCALES.map(
    (locale) =>
      `<xhtml:link rel="alternate" hreflang="${locale}" href="${SITE_URL}${localePath(path, locale)}"/>`,
  );
  links.push(
    `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${localePath(path, 'ckb')}"/>`,
  );
  return links.join('');
}

function urlEntries(path: string, priority: string): string {
  return LOCALES.map((locale) => {
    const loc = `${SITE_URL}${localePath(path, locale)}`;
    return `<url><loc>${loc}</loc>${alternates(path)}<priority>${priority}</priority></url>`;
  }).join('\n');
}

function main(): void {
  const laws = JSON.parse(
    readFileSync(join(ROOT, 'content/normalized/laws.json'), 'utf8'),
  ) as Law[];
  const articles = JSON.parse(
    readFileSync(join(ROOT, 'content/normalized/articles.ckb.json'), 'utf8'),
  ) as Article[];
  const slugByLawId = new Map(laws.map((law) => [law.id, law.slug]));

  const paths: Array<{ path: string; priority: string }> = [
    { path: '/', priority: '1.0' },
    { path: '/search', priority: '0.9' },
    { path: '/about', priority: '0.5' },
  ];

  for (const law of laws) {
    paths.push({ path: `/law/${law.slug}`, priority: '0.8' });
  }
  for (const article of articles) {
    const slug = slugByLawId.get(article.lawId);
    if (!slug) continue;
    paths.push({ path: `/law/${slug}/article/${article.articleNumber}`, priority: '0.6' });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${paths.map(({ path, priority }) => urlEntries(path, priority)).join('\n')}
</urlset>
`;

  const outDir = join(ROOT, 'public');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'sitemap.xml'), xml);
  console.log(`✓ sitemap.xml: ${paths.length} paths × ${LOCALES.length} locales`);
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
