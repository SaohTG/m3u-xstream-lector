import axios from 'axios';

const baseURL = (import.meta.env.VITE_API_URL as string) || '/api';

export const client = axios.create({ baseURL });

client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

client.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      'Erreur réseau';
    console.error('[API ERROR]', status, msg);
    if (status === 401 || status === 403) {
      localStorage.removeItem('token');
      if (!location.pathname.startsWith('/login')) location.replace('/login');
    }
    return Promise.reject(new Error(msg));
  }
);

export async function login(email: string, password: string) {
  const { data } = await client.post('/auth/login', { email, password });
  localStorage.setItem('token', data.access_token);
  return data;
}

export async function register(email: string, password: string) {
  const { data } = await client.post('/auth/register', { email, password });
  localStorage.setItem('token', data.access_token);
  return data;
}

export async function listMovies() {
  const { data } = await client.get('/library/movies');
  return data;
}
