// lib/api.ts — typed API client

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────
export const api = {
  auth: {
    signup: (body: { name: string; email: string; password: string; role: string }) =>
      request<any>('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }, false),
    login: (body: { email: string; password: string }) =>
      request<any>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }, false),
    me: () => request<any>('/api/auth/me'),
    logout: () => request<any>('/api/auth/logout', { method: 'POST' }),
  },

  machines: {
    list: () => request<any[]>('/api/machines'),
    get: (id: number) => request<any>(`/api/machines/${id}`),
    data: (id: number, limit = 100) => request<any[]>(`/api/machines/${id}/data?limit=${limit}`),
    stats: (id: number) => request<any>(`/api/machines/${id}/stats`),
  },

  alerts: {
    list: (params?: { severity?: string; machine_id?: number; resolved?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.severity)   qs.set('severity',   params.severity);
      if (params?.machine_id) qs.set('machine_id', String(params.machine_id));
      if (params?.resolved)   qs.set('resolved',   'true');
      return request<any[]>(`/api/alerts?${qs}`);
    },
    resolve: (id: number) => request<any>(`/api/alerts/${id}/resolve`, { method: 'POST' }),
  },

  ai: {
    ask: (question: string) =>
      request<any>('/api/ask-ai', { method: 'POST', body: JSON.stringify({ question }) }),
    history: (limit = 50) => request<any[]>(`/api/chat-history?limit=${limit}`),
  },

  reports: {
    generate: (body: {
      report_type: string;
      machine_id?: number;
      start_date?: string;
      end_date?: string;
    }) => request<any>('/api/generate-report', { method: 'POST', body: JSON.stringify(body) }),
    list: (machine_id?: number) => {
      const qs = machine_id ? `?machine_id=${machine_id}` : '';
      return request<any[]>(`/api/reports${qs}`);
    },
    get: (id: number) => request<any>(`/api/reports/${id}`),
  },

  admin: {
    users: () => request<any[]>('/api/admin/users'),
    toggleUser: (id: number) => request<any>(`/api/admin/users/${id}/toggle`, { method: 'POST' }),
  },
};