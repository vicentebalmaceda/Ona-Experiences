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
  it('reads the zone id from the html wrapper, ignoring whitespace', () => {
    expect(extractPresentationFromDescriptions(withDescriptions({ Zone: '<p>3</p>' })).zone).toBe(3);
    expect(
      extractPresentationFromDescriptions(withDescriptions({ Zone: '<p> &nbsp;5&nbsp; </p>\n' })).zone
    ).toBe(5);
    expect(
      extractPresentationFromDescriptions(withDescriptions({ Zone: '<div><span>1</span></div>' })).zone
    ).toBe(1);
  });

  it.each(['Coyhaique', '0', '6', '3a', '3.0', '2 4', '', '<p></p>'])(
    'omits invalid zone %j',
    (zone) => {
      expect(extractPresentationFromDescriptions(withDescriptions({ Zone: zone }))).not.toHaveProperty(
        'zone'
      );
    }
  );

  it('decodes Spanish named entities in text fields', () => {
    const info = withDescriptions({ Phone: '<p>Futaleuf&uacute; C&aacute;rdenas</p>' });
    expect(extractPresentationFromDescriptions(info).phone).toBe('Futaleufú Cárdenas');
  });

  it('keeps case-sensitive entities and numeric references', () => {
    const info = withDescriptions({
      Phone: '&Aacute;rea Ays&eacute;n &ntilde;&Ntilde; &#233; &#xF1; &amp;#39;'
    });
    expect(extractPresentationFromDescriptions(info).phone).toBe('Área Aysén ñÑ é ñ &#39;');
  });

  it('leaves unknown entities untouched', () => {
    const info = withDescriptions({ Phone: 'Lago &foo; Yelcho' });
    expect(extractPresentationFromDescriptions(info).phone).toBe('Lago &foo; Yelcho');
  });
});
