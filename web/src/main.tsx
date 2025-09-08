import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Handlers globaux pour diagnostiquer
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Promise]', e.reason);
});
window.addEventListener('error', (e) => {
  console.error('[Window Error]', (e as any).error || e.message);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
