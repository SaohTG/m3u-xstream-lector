export async function api(path: string, opts: any = {}) {
  const { method = 'GET', headers = {}, body } = opts;
  const token = localStorage.getItem('token');
  const res = await fetch(`${(import.meta as any).env.VITE_API_BASE || ''}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.message || j?.error || msg;
      if (Array.isArray(j?.message)) msg = j.message.join(', ');
    } catch {}
    throw new Error(msg);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : {};
}
