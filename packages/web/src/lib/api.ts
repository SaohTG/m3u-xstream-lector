export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (window.location.origin.includes(':5173')
    ? window.location.origin.replace(':5173', ':3000')
    : window.location.origin);

export const getToken = () => localStorage.getItem('token');
export const setToken = (t: string) => localStorage.setItem('token', t);
export const clearToken = () => localStorage.removeItem('token');

export async function api(path: string, opts: any = {}) {
  const { method = 'GET', headers = {}, body } = opts;
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  // certains endpoints peuvent renvoyer vide
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : {};
}
