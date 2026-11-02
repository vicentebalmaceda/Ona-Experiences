import type { CatalogType } from '../../types/catalog.js';

/** Languages BSale descriptions are machine-translated into (Spanish is the source). */
export const TRANSLATED_LANGS = ['en'] as const;
export type TranslatedLang = (typeof TRANSLATED_LANGS)[number];

export interface TranslationKey {
  catalogType: CatalogType;
  productId: number;
  lang: TranslatedLang;
}

export interface TranslationRecord extends TranslationKey {
  /** SHA-256 (hex) of the Spanish HTML this translation was made from. */
  sourceHash: string;
  descriptionHtml: string;
  translatedAt: Date;
}

export interface TranslationStore {
  get(key: TranslationKey): Promise<TranslationRecord | null>;
  save(record: Omit<TranslationRecord, 'translatedAt'>): Promise<TranslationRecord>;
}
