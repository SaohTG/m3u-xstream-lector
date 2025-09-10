const TOKEN_KEY = 'novastream_token';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t: string) {
  try { localStorage.setItem(TOKEN_KEY, t); } catch {}
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

const BASE: string =
  ((import.meta as any).env?.VITE_API_BASE as string | undefined)?.replace(/\/+$/, '') || '';

export async function api(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  // Ajoute Content-Type si body stringifié
  if (!headers.has('Content-Type') && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = BASE ? `${BASE}${path}` : path;
  const res = await fetch(url, { ...init, headers, credentials: 'include' as any });
  const text = await res.text();

  // Essaie JSON sinon renvoie texte
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch {
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${text}`);
    return text;
  }

  if (!res.ok) {
    const msg = data?.message ? (typeof data.message === 'string' ? data.message : JSON.stringify(data.message)) : res.statusText;
    throw new Error(`${res.status} ${res.statusText} – ${msg}`);
  }
  return data ?? {};
}
