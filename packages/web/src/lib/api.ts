// Wrapper Fetch + gestion du token + cookies

export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || 'http://85.31.239.110:3000';

export function getApiBase(): string {
  return API_BASE;
}

const TOKEN_KEY = 'novastream_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token?: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function clearToken() {
  setToken(null);
}

type ApiOptions = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  raw?: boolean; // si true, ne parse pas JSON
};

export class ApiError extends Error {
  status: number;
  raw: any;
  constructor(status: number, raw: any) {
    super(`${status} ${raw?.error || raw?.message || 'API Error'}`);
    this.status = status;
    this.raw = raw;
  }
}

export async function api(path: string, opts: ApiOptions = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'include',
  });

  if (opts.raw) return res;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
