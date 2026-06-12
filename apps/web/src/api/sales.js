const apiBase = () => import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function parseErrorMessage(status, body) {
  if (typeof body === 'object' && body !== null) {
    if (body.error) return body.error;
    if (body.message) return body.message;
  }
  if (typeof body === 'string' && body) return body;
  return `Error ${status}`;
}

function toUserMessage(status, body) {
  const message = parseErrorMessage(status, body);

  if (status === 400) {
    return 'Revisa los datos del formulario e inténtalo de nuevo.';
  }
  if (status === 404) {
    return 'Este producto no está disponible para cotización.';
  }
  if (status === 502 || status === 401) {
    return 'No pudimos conectar con BSale. Intenta más tarde.';
  }

  return message;
}

export async function createQuoteSale(catalogType, productId, body) {
  const url = `${apiBase()}/api/v1/${catalogType}/${productId}/sales`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(toUserMessage(response.status, payload));
    error.status = response.status;
    error.details = payload?.details;
    throw error;
  }

  return payload;
}
