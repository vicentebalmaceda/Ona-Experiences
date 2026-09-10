const apiBase = () => import.meta.env.VITE_API_URL ?? '';

export async function fetchReviewInvite(token) {
  const response = await fetch(`${apiBase()}/api/v1/review-invites/${encodeURIComponent(token)}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(body.error || 'Invite unavailable'), {
      status: response.status,
      code: body.code
    });
  }
  return body;
}

export async function submitReview({ token, rating, comment }) {
  const response = await fetch(`${apiBase()}/api/v1/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, rating, comment })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(body.error || 'Could not submit review'), {
      status: response.status,
      code: body.code
    });
  }
  return body;
}
