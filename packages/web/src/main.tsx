import React from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, Outlet, RouterProvider, createBrowserRouter, Link } from 'react-router-dom';
import { getToken } from './lib/api';
import Movies from './routes/Movies';
import Shows from './routes/Shows';
import Live from './routes/Live';
import Onboarding from './routes/Onboarding';
import Auth from './routes/Auth';
import MovieDetails from './routes/MovieDetails';
import AppErrorBoundary from './AppErrorBoundary';
import RequirePlaylist from './guards/RequirePlaylist';

function Protected({ children }: { children?: React.ReactNode }) {
  const t = getToken();
  if (!t) return <Navigate to="/auth" replace />;
  return <>{children ?? <Outlet />}</>;
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
    </div>
  );
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/movies" replace /> },
  { path: '/auth', element: <Auth /> },
  {
    element: <Shell />,
    children: [
      // Onboarding accessible même sans playlist
      { path: '/onboarding', element: <Protected><Onboarding /></Protected> },

      // Pages qui EXIGENT une playlist liée
      { path: '/movies', element: <Protected><RequirePlaylist><Movies /></RequirePlaylist></Protected> },
      { path: '/shows',  element: <Protected><RequirePlaylist><Shows /></RequirePlaylist></Protected> },
      { path: '/live',   element: <Protected><RequirePlaylist><Live /></RequirePlaylist></Protected> },

      // Détail film
      { path: '/movie/:id', element: <Protected><RequirePlaylist><MovieDetails /></RequirePlaylist></Protected> },
    ]
  },
]);

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

function App() { return <RouterProvider router={router} />; }

const rootEl = document.getElementById('root');
if (!rootEl) {
  console.error('Élément #root introuvable dans index.html');
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </React.StrictMode>
  );
}

export default App;
