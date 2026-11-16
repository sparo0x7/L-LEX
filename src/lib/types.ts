export type Locale = 'ckb' | 'ar' | 'en';
export const LOCALES: Locale[] = ['ckb', 'ar', 'en'];
export const SOURCE_LOCALE: Locale = 'ckb'; // ground-truth language of the data

export type LawId =
  | 'iraqi-penal-code-1969'
  | 'kurdistan-internal-security-forces-law'
  | 'kri-peshmerga-ministry-law-2007'
  | 'kri-peshmerga-honoring-law-2007'
  | 'kri-peshmerga-disability-law-2007'
  | 'kri-peshmerga-service-pension-law-2007'
  | 'iraqi-military-penal-code-2007'
  | 'iraqi-military-procedure-code-2016'
  | 'kri-peshmerga-service-reg-2011'
  | 'kri-reform-law-2020-peshmerga'
  | 'iraqi-military-penal-amendment-2012';

export type PenaltyTag =
  | 'death-penalty'
  | 'life-imprisonment'
  | 'imprisonment'
  | 'fine'
  | 'detention'
  | 'dismissal'
  | 'demotion'
  | 'suspension'
  | 'reprimand'
  | 'salary-cut'
  | 'confiscation'
  | 'other';

export interface Law {
  id: LawId;
  slug: string;
  officialCitation: Partial<Record<Locale, string>>; // e.g. en: "Iraqi Penal Code No. 111 of 1969"
  category: 'penal' | 'security' | 'military' | 'peshmerga';
  articleCount: number; // articles present in the dataset
  totalArticleCount?: number; // articles in the actual law, when known to exceed articleCount
  sourceUrl?: string; // official gazette / parliament link, once verified
  importedAt: string; // ISO date — when this dataset was imported or last changed
  lastVerified?: string; // ISO date — only after a human checks an official source
}

export interface ArticleContent {
  title: string;
  conditions: string;
  penalties: string;
  formattedText: string;
}

export type TranslationStatus = 'source' | 'reviewed' | 'machine' | 'missing';

export interface Article {
  id: string; // `${lawId}-${articleNumber}`
  lawId: LawId;
  articleNumber: number;
  penaltyTags: PenaltyTag[];
  content: Record<Locale, ArticleContent>;
  translationStatus: Record<Locale, TranslationStatus>;
}
