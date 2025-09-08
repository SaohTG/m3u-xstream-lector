import axios from 'axios'

const fromEnv = (import.meta as any)?.env?.VITE_API_URL as string | undefined
const API = (fromEnv || '').trim()

function computeFallbackBaseURL() {
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:4000`
}

const baseURL = API || computeFallbackBaseURL()
export const client = axios.create({ baseURL })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})


export async function login(email: string, password: string) {
  const { data } = await client.post('/auth/login', { email, password })
  localStorage.setItem('token', data.access_token)
  return data
}

export async function register(email: string, password: string, displayName?: string) {
  const { data } = await client.post('/auth/register', { email, password, displayName })
  localStorage.setItem('token', data.access_token)
  return data
}

export async function parseM3U(url: string) {
  const { data } = await client.post('/playlists/parse-m3u', { url })
  return data.items as any[]
}

export async function xtreamConnect(baseUrl: string, username: string, password: string) {
  const { data } = await client.post('/playlists/xtream/connect', { baseUrl, username, password })
  return data
}

export async function toggleFavorite(mediaId: string) {
  const { data } = await client.post('/library/favorites/toggle', { mediaId })
  return data
}

export async function setProgress(mediaId: string, position: number, duration: number) {
  const { data } = await client.post('/library/progress', { mediaId, position, duration })
  return data
}
