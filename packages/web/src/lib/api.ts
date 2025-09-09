const BASE: string = (import.meta as any).env?.VITE_API_BASE || '';

export function getToken(): string | null {
  try { return localStorage.getItem('ns_token'); }
  catch { return null; }
}

export async function api(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    mode: 'cors',
    credentials: 'omit',
  });
  const ct = res.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await res.json().catch(() => ({})) : await res.text().catch(() => '');
  if (!res.ok) {
    const snippet = typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200);
    throw new Error(`${res.status} ${res.statusText} – ${snippet}`);
  }
  return body;
}
