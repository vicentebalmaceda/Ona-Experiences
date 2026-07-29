// Empty VITE_API_URL uses relative /api paths (Vite dev proxy). Set full URL for production.
const apiBase = () => import.meta.env.VITE_API_URL ?? '';

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
  if (status === 500 || status === 502) {
    return 'No pudimos enviar tu mensaje. Intenta más tarde.';
  }

  return message;
}

export async function sendContactMessage(body) {
  const url = `${apiBase()}/api/v1/contact`;
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
