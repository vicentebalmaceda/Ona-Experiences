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
    expect(extractPresentationFromDescriptions(withDescriptions({ Zone: '<p>3</p>' })).zone).toEqual([3]);
    expect(extractPresentationFromDescriptions(withDescriptions({ Zone: '<p>6</p>' })).zone).toEqual([6]);
    expect(
      extractPresentationFromDescriptions(withDescriptions({ Zone: '<p> &nbsp;5&nbsp; </p>\n' })).zone
    ).toEqual([5]);
    expect(
      extractPresentationFromDescriptions(withDescriptions({ Zone: '<div><span>1</span></div>' })).zone
    ).toEqual([1]);
  });

  it('reads comma-separated zone ids for services spanning several zones', () => {
    expect(extractPresentationFromDescriptions(withDescriptions({ Zone: '<p>3,4</p>' })).zone).toEqual([3, 4]);
    expect(
      extractPresentationFromDescriptions(withDescriptions({ Zone: '<p> 4 ,&nbsp;5 </p>' })).zone
    ).toEqual([4, 5]);
    expect(extractPresentationFromDescriptions(withDescriptions({ Zone: '3,3' })).zone).toEqual([3]);
  });

  it.each(['Coyhaique', '0', '7', '3a', '3.0', '2 4', '', '<p></p>', '3,', ',3', '3,7', '3;4'])(
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
