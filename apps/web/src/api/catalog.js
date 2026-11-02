// Empty VITE_API_URL uses relative /api paths (Vite dev proxy). Set full URL for production.
const apiBase = () => import.meta.env.VITE_API_URL ?? '';

async function fetchCatalog(path, { limit = 50, offset = 0 } = {}) {
  const url = `${apiBase()}/api/v1/${path}?limit=${limit}&offset=${offset}`;
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch ${path} (${response.status}): ${body}`);
  }

  return response.json();
}

/** `lang` is the page's URL language: the description comes translated when available. */
async function fetchCatalogItem(path, productId, lang) {
  const query = lang ? `?lang=${encodeURIComponent(lang)}` : '';
  const url = `${apiBase()}/api/v1/${path}/${productId}${query}`;
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Failed to fetch ${path}/${productId} (${response.status}): ${body}`);
    // Lets the detail page tell "no such product" (404) from other failures.
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export async function fetchLodges(params) {
  return fetchCatalog('lodges', params);
}

export async function fetchGuides(params) {
  return fetchCatalog('guides', params);
}

export async function fetchLodgeById(productId, lang) {
  return fetchCatalogItem('lodges', productId, lang);
}

export async function fetchGuideById(productId, lang) {
  return fetchCatalogItem('guides', productId, lang);
}

export async function fetchProductReviews(path, productId) {
  const url = `${apiBase()}/api/v1/${path}/${productId}/reviews`;
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch ${path}/${productId}/reviews (${response.status}): ${body}`);
  }

  return response.json();
}
