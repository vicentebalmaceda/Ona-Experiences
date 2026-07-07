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

async function fetchCatalogItem(path, productId) {
  const url = `${apiBase()}/api/v1/${path}/${productId}`;
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch ${path}/${productId} (${response.status}): ${body}`);
  }

  return response.json();
}

export async function fetchLodges(params) {
  return fetchCatalog('lodges', params);
}

export async function fetchGuides(params) {
  return fetchCatalog('guides', params);
}

export async function fetchLodgeById(productId) {
  return fetchCatalogItem('lodges', productId);
}

export async function fetchGuideById(productId) {
  return fetchCatalogItem('guides', productId);
}
