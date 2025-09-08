import React, { Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import App from './routes/App';
import Auth from './routes/Auth';
import Onboarding from './routes/Onboarding';
import Movies from './routes/Movies';
import Shows from './routes/Shows';
import Live from './routes/Live';
import MyList from './routes/MyList';
import { getToken } from './lib/api';

class ErrorBoundary extends Component<{children:ReactNode}, {err?:any}> {
  constructor(props:any){ super(props); this.state = {}; }
  static getDerivedStateFromError(err:any){ return { err }; }
  componentDidCatch(err:any){ console.error('UI error:', err); }
  render(){
    if(this.state.err){
      return <pre style={{whiteSpace:'pre-wrap', padding:16, color:'#b00', background:'#200'}}>
        Une erreur est survenue côté UI : {String(this.state.err?.message||this.state.err)}
      </pre>;
    }
    return this.props.children;
  }
}

const Protected = ({ children }: { children: JSX.Element }) =>
  getToken() ? children : <Navigate to="/auth" replace />;

const router = createBrowserRouter([
  { path: '/', element: <Navigate to={getToken() ? '/onboarding' : '/auth'} replace /> },
  { path: '/auth', element: <Auth /> },
  { path: '/onboarding', element: <Protected><Onboarding /></Protected> },
  {
    path: '/',
    element: <Protected><App /></Protected>,
    children: [
      { path: 'movies', element: <Movies /> },
      { path: 'shows', element: <Shows /> },
      { path: 'live', element: <Live /> },
      { path: 'list', element: <MyList /> },
    ],
  },
]);

createRoot(document.getElementById('root')!)
  .render(<ErrorBoundary><RouterProvider router={router} /></ErrorBoundary>);
