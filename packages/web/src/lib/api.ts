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

export async function api(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as any || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, {
    ...opts,
    headers,
    // pas de cookies côté API (on est au Bearer)
    credentials: 'omit',
    mode: 'cors',
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (res.status === 401) {
    // token expiré ou absent → on le purge pour forcer la reconnexion
    setToken(null);
    throw new Error(`401 Unauthorized – ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} – ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}
