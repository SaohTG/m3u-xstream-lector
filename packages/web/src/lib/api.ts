// packages/web/src/lib/api.ts
const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || '';

export function getApiBase(): string {
  return API_BASE;
}

const TOKEN_KEY = 'novastream_token';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

type ApiOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  ignoreAuthRedirect?: boolean;
};

export class ApiError extends Error {
  status: number;
  raw: any;
  constructor(status: number, raw: any) {
    super(`${status} ${raw?.error || raw?.message || 'Error'}`);
    this.status = status;
    this.raw = raw;
  }
}

export async function api<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(opts.headers || {}),
  };

  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let body: any = opts.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    body = JSON.stringify(body);
  }

  const res = await fetch(url, {
    method: opts.method || (body ? 'POST' : 'GET'),
    headers,
    body,
    credentials: 'include',
  });

  let data: any = null;
  const ct = res.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) {
    try { data = await res.json(); } catch {}
  } else {
    try { data = await res.text(); } catch {}
  }

  if (!res.ok) {
    if (res.status === 401 && !opts.ignoreAuthRedirect) {
      // Token invalide/expiré -> purge + redirection
      setToken(null);
      if (location.pathname !== '/auth') {
        location.replace('/auth');
      }
    }
    throw new ApiError(res.status, data || { message: res.statusText });
  }

  return data as T;
}
