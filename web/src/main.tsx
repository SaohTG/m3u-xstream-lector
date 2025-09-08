import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// (optionnel) styles globaux / Tailwind
import './index.css';

// Handlers globaux pour mieux diagnostiquer
window.addEventListener('unhandledrejection', (e) => {
  // Affiche l’erreur exacte dans la console (évite les messages minifiés opaques)
  console.error('[Unhandled Promise]', e.reason);
});
window.addEventListener('error', (e) => {
  // Certaines erreurs n’ont pas e.error -> fallback message
  console.error('[Window Error]', (e as any).error || e.message);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
