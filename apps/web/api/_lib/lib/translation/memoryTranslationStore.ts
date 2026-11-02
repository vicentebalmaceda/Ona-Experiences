import type { TranslationKey, TranslationRecord, TranslationStore } from './translationStore.js';

export class MemoryTranslationStore implements TranslationStore {
  readonly rows = new Map<string, TranslationRecord>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async get(key: TranslationKey): Promise<TranslationRecord | null> {
    return this.rows.get(rowKey(key)) ?? null;
  }

  async save(record: Omit<TranslationRecord, 'translatedAt'>): Promise<TranslationRecord> {
    const saved: TranslationRecord = { ...record, translatedAt: this.now() };
    this.rows.set(rowKey(record), saved);
    return saved;
  }
}

function rowKey({ catalogType, productId, lang }: TranslationKey): string {
  return `${catalogType}:${productId}:${lang}`;
}
