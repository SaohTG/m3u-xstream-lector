import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Navigate,
  Link,
} from 'react-router-dom';

import { getToken } from './lib/api';
import Auth from './routes/Auth';
import Onboarding from './routes/Onboarding';
import Movies from './routes/Movies';
import Shows from './routes/Shows';
import Live from './routes/Live';
import MovieDetails from './routes/MovieDetails';
import ShowDetails from './routes/ShowDetails';

function Protected() {
  const t = getToken();
  if (!t) return <Navigate to="/auth" replace />;
  return <Outlet />;
}

function Shell() {
  return (
    <div style={{ minHeight: '100dvh', background: '#0b0b0b', color: '#fff' }}>
      <header style={{ display:'flex', alignItems:'center', gap:16, padding:'12px 16px', borderBottom:'1px solid #222' }}>
        <div style={{ fontWeight:800 }}>NovaStream</div>
        <nav style={{ display:'flex', gap:12, fontSize:14 }}>
          <Link to="/movies">Films</Link>
          <Link to="/shows">Séries</Link>
          <Link to="/live">TV</Link>
          <Link to="/onboarding">Onboarding</Link>
        </nav>
      </header>
      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
      <DebugBar />
    </div>
  );
}

function DebugBar() {
  const token = !!getToken();
  const apiBase = (import.meta as any).env?.VITE_API_BASE || '';
  return (
    <div style={{ position:'fixed', left:8, bottom:8, fontSize:12, opacity:0.8, background:'#111', border:'1px solid #333', borderRadius:8, padding:'6px 8px' }}>
      API: {apiBase || '(par défaut)'} · Token: {token ? '✅' : '❌'}
    </div>
  );
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/movies" replace /> },
  { path: '/auth', element: <Auth /> },
  {
    element: <Shell />,
    children: [
      { path: '/onboarding', element: <Protected><Onboarding /></Protected> },

      // Films
      { path: '/movies', element: <Protected><Movies /></Protected> },
      { path: '/movies/:movieId', element: <Protected><MovieDetails /></Protected> },

      // Séries
      { path: '/shows', element: <Protected><Shows /></Protected> },
      { path: '/shows/:seriesId', element: <Protected><ShowDetails /></Protected> },

      // TV
      { path: '/live', element: <Protected><Live /></Protected> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />);
