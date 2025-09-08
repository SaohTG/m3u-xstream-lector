import axios from 'axios'

// Récupère ce que Vite a injecté (ex: "/api" ou "http://...").
const injected = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
const API = (injected || '').trim();

// Construit un baseURL **absolu** à partir de l'origin du site.
function absoluteBaseURL(): string {
  const origin = `${window.location.protocol}//${window.location.host}`; // ex: http://85.31.239.110:8080
  if (!API) return `${origin}/api`;               // fallback propre
  if (API.startsWith('http')) return API;         // déjà absolu
  // relatif → on préfixe par l'origin (et on garantit le /)
  return `${origin}${API.startsWith('/') ? API : `/${API}`}`;
}

const baseURL = absoluteBaseURL();

export const client = axios.create({ baseURL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- API helpers ----
export async function login(email: string, password: string) {
  const { data } = await client.post('/auth/login', { email, password });
  localStorage.setItem('token', data.access_token);
  return data;
}

export async function register(email: string, password: string, displayName?: string) {
  const { data } = await client.post('/auth/register', { email, password, displayName });
  localStorage.setItem('token', data.access_token);
  return data;
}

// ... imports + client + interceptors identiques

export async function parseM3U(url: string, signal?: AbortSignal) {
  const { data } = await client.post('/playlists/parse-m3u', { url }, { signal });
  return data.items as any[];
}


export async function xtreamConnect(baseUrl: string, username: string, password: string) {
  const { data } = await client.post('/playlists/xtream/connect', { baseUrl, username, password });
  return data;
}

export async function toggleFavorite(mediaId: string) {
  const { data } = await client.post('/library/favorites/toggle', { mediaId });
  return data;
}

export async function setProgress(mediaId: string, position: number, duration: number) {
  const { data } = await client.post('/library/progress', { mediaId, position, duration });
  return data;
}

export async function listMovies(params?: { q?: string; page?: number; pageSize?: number }) {
  const { data } = await client.get('/library/movies', { params });
  return data as { total: number; page: number; pageSize: number; items: any[] };
}

export async function listSeries(params?: { q?: string; page?: number; pageSize?: number }) {
  const { data } = await client.get('/library/series', { params });
  return data;
}

export async function listLive(params?: { q?: string; page?: number; pageSize?: number }) {
  const { data } = await client.get('/library/live', { params });
  return data;
}

