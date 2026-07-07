export type Locale = 'ckb' | 'ar' | 'en';
export const LOCALES: Locale[] = ['ckb', 'ar', 'en'];
export const SOURCE_LOCALE: Locale = 'ckb'; // ground-truth language of the data

export type LawId = 'iraqi-penal-code-1969' | 'kurdistan-internal-security-forces-law';

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
  category: 'penal' | 'security';
  articleCount: number;
  sourceUrl?: string; // official gazette / parliament link, once verified
  lastVerified: string; // ISO date — when a human last checked this against an official source
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
