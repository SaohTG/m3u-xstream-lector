import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';

function Private({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <Private>
              <Home />
            </Private>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* mini footer debug */}
      <div style={{position:'fixed',bottom:6,right:8,fontSize:12,opacity:.6}}>
        API: {import.meta.env.VITE_API_URL || '(non défini)'} • <Link to="/">Home</Link>
      </div>
    </BrowserRouter>
  );
}
