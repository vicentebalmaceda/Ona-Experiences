import type { NeonQueryFunction } from '@neondatabase/serverless';
import { asDate } from '../../db/postgres.js';
import type { CatalogType } from '../../types/catalog.js';
import type { TranslatedLang, TranslationKey, TranslationRecord, TranslationStore } from './translationStore.js';

interface TranslationRow {
  catalog_type: CatalogType;
  bsale_product_id: number;
  lang: TranslatedLang;
  source_hash: string;
  description_html: string;
  translated_at: Date | string;
}

export class PostgresTranslationStore implements TranslationStore {
  constructor(private readonly sql: NeonQueryFunction<false, false>) {}

  async get({ catalogType, productId, lang }: TranslationKey): Promise<TranslationRecord | null> {
    const rows = await this.sql`
      SELECT catalog_type, bsale_product_id, lang, source_hash, description_html, translated_at
      FROM product_translations
      WHERE catalog_type = ${catalogType} AND bsale_product_id = ${productId} AND lang = ${lang}
      LIMIT 1
    `;
    return rows[0] ? toRecord(rows[0] as TranslationRow) : null;
  }

  async save(record: Omit<TranslationRecord, 'translatedAt'>): Promise<TranslationRecord> {
    const rows = await this.sql`
      INSERT INTO product_translations
        (catalog_type, bsale_product_id, lang, source_hash, description_html, translated_at)
      VALUES
        (${record.catalogType}, ${record.productId}, ${record.lang}, ${record.sourceHash}, ${record.descriptionHtml}, now())
      ON CONFLICT (catalog_type, bsale_product_id, lang)
      DO UPDATE SET
        source_hash = excluded.source_hash,
        description_html = excluded.description_html,
        translated_at = now()
      RETURNING catalog_type, bsale_product_id, lang, source_hash, description_html, translated_at
    `;
    return toRecord(rows[0] as TranslationRow);
  }
}

function toRecord(row: TranslationRow): TranslationRecord {
  return {
    catalogType: row.catalog_type,
    productId: Number(row.bsale_product_id),
    lang: row.lang,
    sourceHash: row.source_hash,
    descriptionHtml: row.description_html,
    translatedAt: asDate(row.translated_at)
  };
}
