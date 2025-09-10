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

function computeDefaultBase(): string {
  try {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3000`;
  } catch {
    return 'http://localhost:3000';
  }
}

const ENV_BASE = ((import.meta as any).env?.VITE_API_BASE as string | undefined)?.replace(/\/+$/, '');
const BASE: string = ENV_BASE || computeDefaultBase();
export function getApiBase() { return BASE; } // 👈 helper exporté

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = `${BASE}${path}`;
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();

  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* texte brut */ }

  if (!res.ok) {
    const msg = data?.message
      ? (typeof data.message === 'string' ? data.message : JSON.stringify(data.message))
      : res.statusText;
    throw new ApiError(res.status, msg || `${res.status}`, data);
  }
  return data ?? text ?? {};
}
