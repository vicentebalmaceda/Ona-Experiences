/** Prerender fixtures: API-shaped data as the build embeds it in window.__ONA_DATA__. */

export const DESCRIPTION_TEXT =
  'Ubicado a orillas del río Biobío, el lodge ofrece pesca con mosca de truchas arcoíris y cafés en un entorno único y tranquilo, con guías bilingües, botes y vadeo en más de veinte kilómetros de río privado.';

export const lodgeApiItem = {
  productId: 65561,
  name: 'Bio Bio Lodge',
  description: `<p>Ubicado a orillas del r&iacute;o Biob&iacute;o, el lodge ofrece pesca con mosca de truchas arco&iacute;ris y caf&eacute;s en un entorno &uacute;nico y tranquilo, con gu&iacute;as biling&uuml;es, botes y vadeo en m&aacute;s de veinte kil&oacute;metros de r&iacute;o privado.</p><script>alert(1)</script>`,
  zone: 2,
  phone: '569',
  email: 'mail@example.com',
  representative: 'Sebastián Concha',
  lat: -38.438,
  lng: -71.235,
  image: 'assets/lodges/bio-bio-lodge-1.jpg',
  gallery: ['assets/lodges/bio-bio-lodge-1.jpg', 'assets/lodges/bio-bio-lodge-2.jpg'],
  rating: 4.5,
  reviews: 2,
  ratingLabel: null,
  referencePrice: null
};

/** What DOMPurify (description settings) makes of lodgeApiItem.description. */
export const lodgeDescriptionHtml = `<p>${DESCRIPTION_TEXT}</p>`;

export const lodgeReviews = {
  average: 4.5,
  count: 2,
  items: [
    { id: 'r1', rating: 5, comment: 'Excelente.', displayName: 'Ana P.', createdAt: '2026-01-10T00:00:00.000Z' },
    { id: 'r2', rating: 4, comment: 'Muy bueno.', displayName: 'Luis R.', createdAt: '2026-02-11T00:00:00.000Z' }
  ]
};

export const siteAssets = {
  items: {
    hero: { kind: 'video', url: 'https://blob.example.com/hero.mp4', alt: null, width: 1920, height: 1080 },
    hero_poster: { kind: 'image', url: 'https://blob.example.com/poster.jpg', alt: null, width: 1920, height: 1080 },
    logo: null
  }
};

export const guideApiItem = {
  ...lodgeApiItem,
  productId: 70001,
  name: 'Juan Pérez',
  description: null,
  rating: null,
  reviews: 0
};

export function homeData(path = '/', lang = 'es') {
  return {
    v: 1,
    path,
    pageId: 'home',
    lang,
    siteAssets,
    catalog: { lodges: [lodgeApiItem], guides: [guideApiItem] }
  };
}

export function lodgeData(path, lang = 'es') {
  return {
    v: 1,
    path,
    pageId: 'lodge',
    lang,
    siteAssets,
    detail: { catalogType: 'lodges', item: lodgeApiItem, reviews: lodgeReviews, descriptionHtml: lodgeDescriptionHtml }
  };
}
