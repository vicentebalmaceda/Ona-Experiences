import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Translator } from '../lib/translation/googleTranslator.js';
import { MemoryTranslationStore } from '../lib/translation/memoryTranslationStore.js';
import { DescriptionTranslationService, hashDescription } from './descriptionTranslationService.js';

const lodge = { productId: 7, name: 'Río Lodge', description: '<p>Pesca con mosca en el río.</p>' };

let store: MemoryTranslationStore;
let translateHtml: ReturnType<typeof vi.fn>;
let service: DescriptionTranslationService;

beforeEach(() => {
  store = new MemoryTranslationStore(() => new Date('2026-11-02T10:00:00.000Z'));
  translateHtml = vi.fn(async (html: string) => html.replace('Pesca con mosca en el río', 'Fly fishing on the river'));
  service = new DescriptionTranslationService({ store, translator: { translateHtml } as Translator });
});

describe('DescriptionTranslationService.localize', () => {
  it('translates, stores and serves the English description', async () => {
    const item = await service.localize('lodge', lodge, 'en');

    expect(item).toEqual({
      ...lodge,
      description: '<p>Fly fishing on the river.</p>',
      descriptionLang: 'en',
      descriptionLangs: ['es', 'en']
    });
    expect(translateHtml).toHaveBeenCalledWith(lodge.description, { from: 'es', to: 'en' });
    expect(await store.get({ catalogType: 'lodge', productId: 7, lang: 'en' })).toMatchObject({
      sourceHash: hashDescription(lodge.description),
      descriptionHtml: '<p>Fly fishing on the river.</p>'
    });
  });

  it('keeps the Spanish description on Spanish requests and reports the English one exists', async () => {
    const item = await service.localize('lodge', lodge, 'es');

    expect(item).toEqual({ ...lodge, descriptionLang: 'es', descriptionLangs: ['es', 'en'] });
  });

  it('reuses a current translation without calling Google again', async () => {
    await service.localize('lodge', lodge, 'en');
    await service.localize('lodge', lodge, 'en');
    await service.localize('lodge', lodge, 'es');

    expect(translateHtml).toHaveBeenCalledTimes(1);
  });

  it('translates again after the Spanish description changes', async () => {
    await service.localize('lodge', lodge, 'en');
    const changed = { ...lodge, description: '<p>Pesca con mosca en el río, todo el año.</p>' };

    const item = await service.localize('lodge', changed, 'en');

    expect(translateHtml).toHaveBeenCalledTimes(2);
    expect(item.description).toBe('<p>Fly fishing on the river, todo el año.</p>');
  });

  it('serves Spanish, Spanish-only, when the translation fails', async () => {
    translateHtml.mockRejectedValueOnce(new Error('quota'));

    const item = await service.localize('guide', lodge, 'en');

    expect(item).toEqual({ ...lodge, descriptionLang: 'es', descriptionLangs: ['es'] });
    expect(store.rows.size).toBe(0);
  });

  it('serves Spanish instead of a stale translation it cannot refresh', async () => {
    await store.save({
      catalogType: 'lodge',
      productId: 7,
      lang: 'en',
      sourceHash: hashDescription('<p>Old text.</p>'),
      descriptionHtml: '<p>Old English.</p>'
    });
    translateHtml.mockRejectedValueOnce(new Error('down'));

    const item = await service.localize('lodge', lodge, 'en');

    expect(item.description).toBe(lodge.description);
    expect(item.descriptionLang).toBe('es');
  });

  it('does nothing for items without a description', async () => {
    const item = await service.localize('lodge', { ...lodge, description: null }, 'en');

    expect(item).toMatchObject({ description: null, descriptionLang: 'es', descriptionLangs: ['es'] });
    expect(translateHtml).not.toHaveBeenCalled();
  });
});
