/**
 * Source normalization — CLAUDE.md §6.2 step 1.
 *
 * Reads content/source/*.json and writes content/normalized/laws.json +
 * articles.ckb.json in the §6.1 shape. Runs at build time only, never on the
 * client. Penalty tagging (step 2) is applied inline via classify-penalties.ts.
 *
 * en/ar content is written as empty with translationStatus 'missing' until the
 * Phase 6 translation pipeline runs; the UI must fall back to ckb, never blank.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Article, ArticleContent, Law, LawId, Locale } from '../src/lib/types.ts';
import { classifyPenalties } from './classify-penalties.ts';

interface RawArticle {
  article_number: number;
  law_name: string;
  title_and_conditions: string;
  consequences_and_penalties: string;
  formatted_text: string;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE_PATH = join(ROOT, 'law_data_json', 'yasay_peshmerga_military_justice.json');

export const BUNDLE_LAW_CONFIGS: Record<
  string,
  {
    lawId: LawId;
    category: Law['category'];
    importDate: string;
    totalArticleCount?: number; // overrides bundle metadata when it only counts imported articles
    officialCitation: Partial<Record<Locale, string>>;
  }
> = {
  'KRI-LAW-19-2007': {
    lawId: 'kri-peshmerga-ministry-law-2007',
    category: 'security',
    importDate: '2026-11-11',
    officialCitation: {
      ckb: 'یاسای وەزارەتی پێشمەرگە لە هەرێمی کوردستان ـ عێراق ژمارە (١٩)ی ساڵی ٢٠٠٧',
      ar: 'قانون رقم (19) لسنة 2007 قانون وزارة البيشمركة في إقليم كوردستان ـ العراق',
      en: 'Kurdistan Region Ministry of Peshmerga Law No. 19 of 2007',
    },
  },
  'KRI-LAW-33-2007': {
    lawId: 'kri-peshmerga-honoring-law-2007',
    category: 'security',
    importDate: '2026-11-11',
    officialCitation: {
      ckb: 'یاسای ڕێزلێنانی پێشمەرگە (زێرەڤانی هەرێمی کوردستان ـ عێراق) ژمارە (٣٣)ی ساڵی ٢٠٠٧',
      ar: 'قانون رقم (33) لسنة 2007 قانون تكريم البيشمركة (حرس إقليم كوردستان ـ العراق)',
      en: 'Kurdistan Region Peshmerga (Regional Guard) Honoring Law No. 33 of 2007',
    },
  },
  'KRI-LAW-34-2007': {
    lawId: 'kri-peshmerga-disability-law-2007',
    category: 'security',
    importDate: '2026-11-11',
    officialCitation: {
      ckb: 'یاسای خانەنشینی کەمئەندامانی پێشمەرگە (زێرەڤانی هەرێمی کوردستان ـ عێراق) ژمارە (٣٤)ی ساڵی ٢٠٠٧',
      ar: 'قانون رقم (34) لسنة 2007 قانون تقاعد معوقي البيشمركة (حرس اقليم كوردستان ـ العراق)',
      en: 'Kurdistan Region Peshmerga Disability Retirement Law No. 34 of 2007',
    },
  },
  'KRI-LAW-38-2007': {
    lawId: 'kri-peshmerga-service-pension-law-2007',
    category: 'security',
    importDate: '2026-11-11',
    officialCitation: {
      ckb: 'یاسای ڕاژە و خانەنشینی پێشمەرگە (زێرەڤانی هەرێمی کوردستان) ژمارە (٣٨)ی ساڵی ٢٠٠٧',
      ar: 'قانون رقم (38) لسنة 2007 قانون الخدمة والتقاعد لقوات پیشمەرگە كوردستان (حرس إقليم كوردستان)',
      en: 'Kurdistan Region Peshmerga (Regional Guard) Service and Retirement Law No. 38 of 2007',
    },
  },
  'IRQ-FED-MIL-PENAL-19-2007': {
    lawId: 'iraqi-military-penal-code-2007',
    category: 'penal',
    importDate: '2026-11-11',
    officialCitation: {
      ckb: 'یاسای سزای سەربازی عێراقی فیدراڵ ژمارە (١٩)ی ساڵی ٢٠٠٧ (تەواوی دەق و ماددەکان)',
      ar: 'قانون العقوبات العسكري العراقي الاتحادي رقم (19) لسنة 2007 (النصوص والمواد الكاملة)',
      en: 'Iraqi Federal Military Penal Code No. 19 of 2007 (Complete Articles and Provisions)',
    },
  },
  'IRQ-FED-MIL-PROC-22-2016': {
    lawId: 'iraqi-military-procedure-code-2016',
    category: 'penal',
    importDate: '2026-11-11',
    officialCitation: {
      ckb: 'یاسای بنەماکانی دادگاییکردنی سزایی سەربازی عێراقی فیدراڵ ژمارە (٢٢)ی ساڵی ٢٠١٦ (تەواوی ١٠٨ ماددە)',
      ar: 'قانون أصول المحاكمات الجزائية العسكري الاتحادي رقم (22) لسنة 2016 (كامل المواد 108)',
      en: 'Iraqi Federal Military Criminal Procedure Code No. 22 of 2016 (Complete 108 Articles)',
    },
  },
  'KRI-REG-6-2011': {
    lawId: 'kri-peshmerga-service-reg-2011',
    category: 'security',
    importDate: '2026-11-11',
    officialCitation: {
      ckb: 'پەیڕەوی ژمارە (٦)ی ساڵی ٢٠١١ ـ پەیڕەوی ڕاژە و خانەنشینی پێشمەرگە تایبەت بە یاسای ژمارە (٣٨)ی ساڵی ٢٠٠٧',
      ar: 'نظام رقم (6) لسنة 2011 ـ نظام خدمة وتقاعد البيشمركة الصادر لتنفيذ قانون رقم (38) لسنة 2007',
      en: 'Kurdistan Region Regulation No. 6 of 2011 Implementing Peshmerga Service and Retirement Law No. 38 of 2007',
    },
  },
  'KRI-LAW-2-2020': {
    lawId: 'kri-reform-law-2020-peshmerga',
    category: 'security',
    importDate: '2026-11-11',
    // The bundle imports only the Peshmerga/defense-pension articles; the
    // official Kurdistan Parliament text has 19 articles total.
    totalArticleCount: 19,
    officialCitation: {
      ckb: 'یاسای چاکسازی لە مووچە و دەرماڵە و بەخشین و ئیمتیازات و خانەنشینی لە هەرێمی کوردستان ـ عێراق ژمارە (٢)ی ساڵی ٢٠٢٠ (ماددە پەیوەندیدارەکانی پێشمەرگە و سەربازی)',
      ar: 'قانون الإصلاح في الرواتب والمخصصات والمنح والامتيازات والتقاعد في إقليم كوردستان ـ العراق رقم (2) لسنة 2020 (المواد الخاصة بالبيشمركة والتقاعد العسكري)',
      en: 'Kurdistan Region Reform Law No. 2 of 2020 (Peshmerga, Military Justice, and Defense Pension Articles)',
    },
  },
  'IRQ-FED-LAW-36-2012': {
    lawId: 'iraqi-military-penal-amendment-2012',
    category: 'penal',
    importDate: '2026-11-11',
    officialCitation: {
      ckb: 'یاسای هەموارکردنی یەکەمی یاسای سزای سەربازی ژمارە (١٩)ی ساڵی ٢٠٠٧ (یاسای ژمارە ٣٦ی ساڵی ٢٠١٢)',
      ar: 'قانون التعديل الأول لقانون العقوبات العسكري رقم (19) لسنة 2007 (قانون رقم 36 لسنة 2012)',
      en: 'First Amendment Law No. 36 of 2012 to Federal Military Penal Code No. 19 of 2007',
    },
  },
};

const SOURCES: ReadonlyArray<{
  file: string;
  lawId: LawId;
  category: Law['category'];
  citations?: Partial<Record<Locale, string>>;
  totalArticleCount?: number;
  importDate: string; // when this source file's data last changed — NOT §15 verification
}> = [
  {
    file: 'iraqi_penal_code_1969.json',
    lawId: 'iraqi-penal-code-1969',
    category: 'penal',
    // en/ar are direct renderings of the number/year already present in
    // law_name (١١١ی ساڵی ١٩٦٩); ar matches the user-supplied trilingual data.
    citations: {
      en: 'Iraqi Penal Code No. 111 of 1969',
      ar: 'قانون العقوبات العراقي رقم ١١١ لسنة ١٩٦٩',
    },
    importDate: '2026-07-07',
  },
  {
    file: 'kurdistan_internal_security_forces_law.json',
    lawId: 'kurdistan-internal-security-forces-law',
    category: 'security',
    // TODO: en/ar citation requires verification against parliament.krd — several
    // candidate laws exist (No. 17/2008, No. 14/2011 implementing law, …). Do not guess.
    // Articles 55–90 were supplied by the user on 2026-07-09, completing the law
    // at 90 articles (§15 official-source verification still pending).
    totalArticleCount: 90,
    importDate: '2026-07-09',
  },
];

/**
 * All 593 source articles follow '{title} ({arabic term})؛ {conditions}' — the
 * Arabic semicolon after the parenthetical term separates title from body
 * (verified 593/593 in the pre-implementation audit). The no-delimiter branch
 * is defensive, for future source files only.
 */
function splitTitleAndConditions(text: string): { title: string; conditions: string } {
  const separatorIndex = text.indexOf('؛');
  if (separatorIndex === -1) return { title: '', conditions: text.trim() };
  return {
    title: text.slice(0, separatorIndex).trim(),
    conditions: text.slice(separatorIndex + 1).trim(),
  };
}

function emptyContent(): ArticleContent {
  return { title: '', conditions: '', penalties: '', formattedText: '' };
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function main(): void {
  const laws: Law[] = [];
  const articles: Article[] = [];

  for (const source of SOURCES) {
    const raw: RawArticle[] = JSON.parse(
      readFileSync(join(ROOT, 'content/source', source.file), 'utf8'),
    );
    if (raw.length === 0) fail(`${source.file}: no articles`);

    const firstArticle = raw[0];
    if (!firstArticle) fail(`${source.file}: no articles`);

    raw.forEach((record, index) => {
      if (record.article_number !== index + 1) {
        fail(`${source.file}: expected article ${index + 1}, got ${record.article_number}`);
      }
      if (!record.title_and_conditions.trim() || !record.consequences_and_penalties.trim()) {
        fail(`${source.file}: article ${record.article_number} has an empty content field`);
      }
    });

    laws.push({
      id: source.lawId,
      slug: source.lawId,
      // sourceUrl stays absent until verified against the official source.
      officialCitation: { ckb: firstArticle.law_name, ...source.citations },
      category: source.category,
      articleCount: raw.length,
      totalArticleCount: source.totalArticleCount,
      importedAt: source.importDate,
    });

    for (const record of raw) {
      const { title, conditions } = splitTitleAndConditions(record.title_and_conditions);
      articles.push({
        id: `${source.lawId}-${record.article_number}`,
        lawId: source.lawId,
        articleNumber: record.article_number,
        penaltyTags: classifyPenalties(record.consequences_and_penalties),
        content: {
          ckb: {
            title,
            conditions,
            penalties: record.consequences_and_penalties,
            formattedText: record.formatted_text,
          },
          en: emptyContent(),
          ar: emptyContent(),
        },
        translationStatus: { ckb: 'source', en: 'missing', ar: 'missing' },
      });
    }
  }

  if (existsSync(BUNDLE_PATH)) {
    interface BundleLaw {
      id: string;
      number: number;
      year: number;
      title_ku: string;
      title_ar: string;
      title_en: string;
      total_articles?: number;
      articles: Array<{
        number: number;
        title_ku: string;
        title_ar: string;
        title_en: string;
        content_ku: string;
        content_ar: string;
        content_en: string;
      }>;
    }

    const bundle = JSON.parse(readFileSync(BUNDLE_PATH, 'utf8'));
    const sections = [
      'regional_peshmerga_laws',
      'federal_military_justice_laws',
      'related_legal_instruments',
    ];

    for (const sec of sections) {
      const bundleLaws: BundleLaw[] = bundle[sec] ?? [];
      for (const blaw of bundleLaws) {
        const cfg = BUNDLE_LAW_CONFIGS[blaw.id];
        if (!cfg) continue;

        laws.push({
          id: cfg.lawId,
          slug: cfg.lawId,
          officialCitation: cfg.officialCitation,
          category: cfg.category,
          articleCount: blaw.articles.length,
          totalArticleCount: cfg.totalArticleCount ?? blaw.total_articles ?? blaw.articles.length,
          importedAt: cfg.importDate,
        });

        for (const record of blaw.articles) {
          articles.push({
            id: `${cfg.lawId}-${record.number}`,
            lawId: cfg.lawId,
            articleNumber: record.number,
            penaltyTags: classifyPenalties(record.content_ku),
            content: {
              ckb: {
                title: record.title_ku.trim(),
                conditions: record.content_ku.trim(),
                penalties: '',
                formattedText: `یاسای ${record.number} > ${record.title_ku.trim()} > ${record.content_ku.trim()}`,
              },
              en: {
                title: record.title_en?.trim() ?? '',
                conditions: record.content_en?.trim() ?? '',
                penalties: '',
                formattedText: `Article ${record.number} > ${record.title_en?.trim() ?? ''} > ${record.content_en?.trim() ?? ''}`,
              },
              ar: {
                title: record.title_ar?.trim() ?? '',
                conditions: record.content_ar?.trim() ?? '',
                penalties: '',
                formattedText: `المادة ${record.number} > ${record.title_ar?.trim() ?? ''} > ${record.content_ar?.trim() ?? ''}`,
              },
            },
            translationStatus: { ckb: 'source', en: 'machine', ar: 'machine' },
          });
        }
      }
    }
  }

  const outDir = join(ROOT, 'content/normalized');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'laws.json'), JSON.stringify(laws, null, 2) + '\n');
  writeFileSync(join(outDir, 'articles.ckb.json'), JSON.stringify(articles, null, 2) + '\n');

  const emptyTitles = articles.filter((a) => a.content.ckb.title === '').length;
  const distribution: Record<string, number> = {};
  for (const article of articles) {
    for (const tag of article.penaltyTags) distribution[tag] = (distribution[tag] ?? 0) + 1;
  }

  console.log(`✓ ${laws.length} laws, ${articles.length} articles → content/normalized/`);
  console.log(`  articles with empty title after split: ${emptyTitles}`);
  console.log('  penalty tag distribution:');
  for (const [tag, count] of Object.entries(distribution).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${tag.padEnd(20)} ${count}`);
  }
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
