import { API_URL, api as request } from '@/lib/api';

type Params = Record<string, unknown>;

function qs(params?: Params) {
  if (!params) return '';
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const out = sp.toString();
  return out ? `?${out}` : '';
}

async function withData<T = any>(path: string, options: RequestInit = {}) {
  const data = await request<T>(path, options);
  return { data };
}

export const api = {
  get: <T = any>(path: string) => withData<T>(path),
  post: <T = any>(path: string, body?: unknown) => withData<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
};

export const productApi = {
  list: (params?: Params) => api.get(`/products${qs(params)}`),
  detail: (slug: string) => api.get(`/products/${slug}`),
  related: (slug: string, limit = 8) => api.get(`/products/${encodeURIComponent(slug)}/related${qs({ limit })}`),
  batch: (slugs: string[]) => api.get(`/products/batch${qs({ slugs: slugs.join(',') })}`),
  autocomplete: (query: string) => api.get(`/products/autocomplete${qs({ q: query })}`),
};

export const dropApi = {
  active: () => api.get('/drops/active'),
  siteState: () => api.get('/drops/site-state'),
  notify: (email: string, dropId?: string) => api.post('/drops/notify', { email, dropId }),
  subscribe: (dropId: string, email: string) => api.post('/drops/notify', { email, dropId }),
};

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  verifyLoginCode: (challengeId: string, code: string) => api.post('/auth/verify-login-code', { challengeId, code }),
  register: (name: string, email: string, password: string, enableEmailCodeLogin = false) => api.post('/auth/register', { name, email, password, enableEmailCodeLogin }),
  verifyEmail: (email: string, code: string) => api.post('/auth/verify-email', { email, code }),
  resendVerification: (email: string) => api.post('/auth/resend-verification', { email }),
  me: () => api.get('/auth/me'),
  updatePreferences: (payload: { twoFactorEmailEnabled: boolean }) => api.post('/auth/preferences', payload),
  unlockAccount: (email: string, code: string, password: string, confirmPassword: string) => api.post('/auth/unlock-account', { email, code, password, confirmPassword }),
};

export const contentApi = {
  list: (area?: string) => api.get(`/content${qs({ area })}`),
};

export { API_URL };
