function apiBase() {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/\/$/, '');
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBase()}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data?.error || 'Request failed');
    error.status = response.status;
    error.code = data?.code;
    error.data = data;
    throw error;
  }

  return data;
}

export const adminApi = {
  login(credentials) {
    return request('/api/v1/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },
  logout() {
    return request('/api/v1/admin/logout', { method: 'POST', body: '{}' });
  },
  me() {
    return request('/api/v1/admin/me');
  },
  listQuotes() {
    return request('/api/v1/admin/quotes');
  },
  sendInvite(bsaleDocumentId, adminNote) {
    return request(`/api/v1/admin/quotes/${bsaleDocumentId}/invite`, {
      method: 'POST',
      body: JSON.stringify(adminNote ? { adminNote } : {})
    });
  },
  resendInvite(bsaleDocumentId) {
    return request(`/api/v1/admin/quotes/${bsaleDocumentId}/invite/resend`, {
      method: 'POST',
      body: '{}'
    });
  },
  listInvites() {
    return request('/api/v1/admin/review-invites');
  },
  listReviews() {
    return request('/api/v1/admin/reviews');
  },
  setReviewHidden(reviewId, hidden) {
    return request(`/api/v1/admin/reviews/${reviewId}`, {
      method: 'PATCH',
      body: JSON.stringify({ hidden })
    });
  },
  syncProducts() {
    return request('/api/v1/admin/products/sync', { method: 'POST', body: '{}' });
  }
};
