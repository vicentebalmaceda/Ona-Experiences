import { describe, expect, it } from 'vitest';
import type { BsaleMarketInfo } from '../../types/bsale.js';
import { extractPresentationFromDescriptions } from './marketInfo.js';

function withDescriptions(entries: Record<string, string>): BsaleMarketInfo {
  return {
    descriptions: Object.entries(entries).map(([descriptionName, html]) => ({
      descriptionName,
      html
    }))
  } as BsaleMarketInfo;
}

describe('extractPresentationFromDescriptions', () => {
  it('decodes Spanish named entities in the zone', () => {
    const info = withDescriptions({
      Zone: '<p>Futaleuf&uacute; - Palena - Puerto C&aacute;rdenas</p>'
    });
    expect(extractPresentationFromDescriptions(info).zone).toBe(
      'Futaleufú - Palena - Puerto Cárdenas'
    );
  });

  it('keeps case-sensitive entities and numeric references', () => {
    const info = withDescriptions({
      Zone: '&Aacute;rea Ays&eacute;n &ntilde;&Ntilde; &#233; &#xF1; &amp;#39;'
    });
    expect(extractPresentationFromDescriptions(info).zone).toBe('Área Aysén ñÑ é ñ &#39;');
  });

  it('leaves unknown entities untouched', () => {
    const info = withDescriptions({ Zone: 'Lago &foo; Yelcho' });
    expect(extractPresentationFromDescriptions(info).zone).toBe('Lago &foo; Yelcho');
  });
});
