// Front helper API — stringifie automatiquement les bodies JSON

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

export function getToken(): string | null {
  try { return localStorage.getItem('ns_token'); } catch { return null; }
}

export function setToken(t: string | null) {
  try {
    if (!t) localStorage.removeItem('ns_token');
    else localStorage.setItem('ns_token', t);
  } catch {}
}

function isPlainJsonBody(v: any) {
  if (!v) return false;
  if (typeof v !== 'object') return false;
  if (v instanceof FormData) return false;
  if (v instanceof URLSearchParams) return false;
  if (v instanceof Blob) return false;
  if (v instanceof ArrayBuffer) return false;
  return true; // objet JS simple -> à stringifier
}

export async function api(path: string, opts: RequestInit = {}) {
  const token = getToken();

  const init: RequestInit = { method: 'GET', ...opts };
  const headers: Record<string, string> = { ...(init.headers as any) };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  let body = init.body as any;

  // Stringify auto pour POST/PUT/PATCH/DELETE si body est un objet simple
  const method = String(init.method || 'GET').toUpperCase();
  if (method !== 'GET' && isPlainJsonBody(body)) {
    body = JSON.stringify(body);
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(API_BASE + path, {
    ...init,
    headers,
    body,
    mode: 'cors',
    credentials: 'omit',
  });

  const raw = await res.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }

  if (res.status === 401) {
    setToken(null);
    throw new Error(`401 Unauthorized – ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} – ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}
