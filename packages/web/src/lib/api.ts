const BASE: string = (import.meta as any).env?.VITE_API_BASE || '';

export function getToken(): string | null {
  try { return localStorage.getItem('ns_token'); }
  catch { return null; }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem('ns_token', token);
    else localStorage.removeItem('ns_token');
  } catch { /* ignore */ }
}

function isFormData(x: any): x is FormData {
  return typeof FormData !== 'undefined' && x instanceof FormData;
}
function isBlob(x: any): x is Blob {
  return typeof Blob !== 'undefined' && x instanceof Blob;
}
function isURLSearchParams(x: any): x is URLSearchParams {
  return typeof URLSearchParams !== 'undefined' && x instanceof URLSearchParams;
}
function isArrayBuffer(x: any): x is ArrayBuffer {
  return typeof ArrayBuffer !== 'undefined' && x instanceof ArrayBuffer;
}

export async function api(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const url = `${BASE}${path}`;

  const headers = new Headers(opts.headers as any);

  // Auth
  if (token) headers.set('Authorization', `Bearer ${token}`);

  // Corps de requête : auto-JSON stringify si c'est un objet JS
  let body: any = opts.body as any;
  const hasBody = body !== undefined && body !== null;

  if (hasBody) {
    const isString = typeof body === 'string';
    const isStream = typeof ReadableStream !== 'undefined' && body instanceof ReadableStream;

    if (!isString && !isFormData(body) && !isBlob(body) && !isURLSearchParams(body) && !isArrayBuffer(body) && !isStream) {
      // Objet JS => JSON
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      body = JSON.stringify(body);
    } else {
      // Ne PAS forcer Content-Type pour FormData/Blob/URLSearchParams/ArrayBuffer
      if (isURLSearchParams(body) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
      }
    }
  }

  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  const res = await fetch(url, {
    ...opts,
    headers,
    body,
    mode: 'cors',
    credentials: 'omit',
  });

  const ct = res.headers.get('content-type') || '';
  const bodyOut = ct.includes('application/json')
    ? await res.json().catch(() => ({}))
    : await res.text().catch(() => '');

  if (!res.ok) {
    const snippet = typeof bodyOut === 'string' ? bodyOut.slice(0, 200) : JSON.stringify(bodyOut).slice(0, 200);
    throw new Error(`${res.status} ${res.statusText} – ${snippet}`);
  }
  return bodyOut;
}
