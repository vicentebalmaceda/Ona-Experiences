import { createHash } from 'node:crypto';
import type { Translator } from '../lib/translation/googleTranslator.js';
import {
  TRANSLATED_LANGS,
  type TranslatedLang,
  type TranslationStore
} from '../lib/translation/translationStore.js';
import type { CatalogType } from '../types/catalog.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('description-translation');

/** BSale descriptions are written in Spanish. */
export const SOURCE_LANG = 'es';
export type DescriptionLang = typeof SOURCE_LANG | TranslatedLang;

export interface DescribedItem {
  productId: number;
  description: string | null;
}

/**
 * The item as served in a language:
 * - `description`: in `descriptionLang`, the requested language when a
 *   translation exists, else the Spanish source.
 * - `descriptionLangs`: every language the description exists in, which is
 *   what the detail page's head pairs with hreflang.
 */
export type LocalizedItem<T extends DescribedItem> = T & {
  descriptionLang: DescriptionLang;
  descriptionLangs: DescriptionLang[];
};

export function hashDescription(html: string): string {
  return createHash('sha256').update(html).digest('hex');
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTranslatedLang(lang: string): lang is TranslatedLang {
  return (TRANSLATED_LANGS as readonly string[]).includes(lang);
}

/**
 * Machine translations of BSale descriptions, stored per product and language
 * and keyed by a hash of the Spanish source: a product is translated once, and
 * again only after its BSale description changes. A missing or stale
 * translation is made on demand (the prerender asks for every product, so a
 * deploy fills them all); when that fails the Spanish source is served, and the
 * English page stays out of the index (see buildHead).
 */
export class DescriptionTranslationService {
  private readonly inFlight = new Map<string, Promise<string | null>>();

  constructor(
    private readonly deps: {
      store: TranslationStore;
      translator: Translator;
    }
  ) {}

  /** The item with its description in `lang` (see LocalizedItem). */
  async localize<T extends DescribedItem>(
    catalogType: CatalogType,
    item: T,
    lang: string
  ): Promise<LocalizedItem<T>> {
    const source = item.description;
    if (!hasText(source)) {
      return { ...item, descriptionLang: SOURCE_LANG, descriptionLangs: [SOURCE_LANG] };
    }

    const translations = new Map<TranslatedLang, string>();
    for (const target of TRANSLATED_LANGS) {
      const html = await this.translation(catalogType, item.productId, source, target);
      if (html) translations.set(target, html);
    }

    const descriptionLangs: DescriptionLang[] = [SOURCE_LANG, ...translations.keys()];
    const translated = isTranslatedLang(lang) ? translations.get(lang) : undefined;
    return translated
      ? { ...item, description: translated, descriptionLang: lang as TranslatedLang, descriptionLangs }
      : { ...item, descriptionLang: SOURCE_LANG, descriptionLangs };
  }

  /** The stored translation when current, else a fresh one; null when none can be made. */
  private translation(
    catalogType: CatalogType,
    productId: number,
    source: string,
    lang: TranslatedLang
  ): Promise<string | null> {
    const sourceHash = hashDescription(source);
    const key = `${catalogType}:${productId}:${lang}:${sourceHash}`;
    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const task = (async () => {
      try {
        const stored = await this.deps.store.get({ catalogType, productId, lang });
        if (stored && stored.sourceHash === sourceHash && hasText(stored.descriptionHtml)) {
          return stored.descriptionHtml;
        }
        const descriptionHtml = await this.deps.translator.translateHtml(source, { from: SOURCE_LANG, to: lang });
        if (!hasText(descriptionHtml)) return null;
        await this.deps.store.save({ catalogType, productId, lang, sourceHash, descriptionHtml });
        log.info('Translated product description', { catalogType, productId, lang, chars: source.length });
        return descriptionHtml;
      } catch (error) {
        log.warn('No translation for product description; serving Spanish', {
          catalogType,
          productId,
          lang,
          error: error instanceof Error ? error.message : String(error)
        });
        return null;
      } finally {
        this.inFlight.delete(key);
      }
    })();
    this.inFlight.set(key, task);
    return task;
  }
}
