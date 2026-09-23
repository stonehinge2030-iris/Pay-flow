const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Try again.');
  }
  return data;
}

export const api = {
  signup: (body) => request('/auth/signup', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: (token) => request('/users/me', { token }),
  lookup: (email, token) => request(`/users/lookup?email=${encodeURIComponent(email)}`, { token }),
  payoutOnboardingLink: (token) =>
    request('/users/payout-onboarding-link', { method: 'POST', token }),
  refreshPayoutStatus: (token) =>
    request('/users/payout-status/refresh', { method: 'POST', token }),
  addFundsIntent: (amountCents, token) =>
    request('/payments/add-funds/intent', { method: 'POST', body: { amountCents }, token }),
  send: (body, token) => request('/payments/send', { method: 'POST', body, token }),
  withdraw: (amountCents, token) =>
    request('/payments/withdraw', { method: 'POST', body: { amountCents }, token }),
  transactions: (token) => request('/payments/transactions', { token }),
};
