import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, ApiError } from '../lib/api';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('demo@novastream.app');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/login';
      const { token } = await api(endpoint, {
        body: { email: email.trim(), password },
      });
      setToken(token);
      navigate('/movies');
    } catch (err: any) {
      if (err instanceof ApiError) {
        // Montre le message renvoyé par l’API si dispo
        const msg =
          Array.isArray(err.raw?.message)
            ? err.raw.message.join(', ')
            : err.raw?.message || `${err.status} ${err.raw?.error || 'Erreur'}`;
        setError(msg);
        console.error('Auth error:', err.status, err.raw);
      } else {
        setError('Erreur réseau');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0b0b0b', color: '#eee', display: 'grid', placeItems: 'center', padding: 16 }}>
      <form
        onSubmit={submit}
        style={{
          width: 420,
          maxWidth: '95vw',
          background: '#121212',
          border: '1px solid #222',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
          NovaStream <span style={{ opacity: 0.7, fontWeight: 600 }}>— Authentification</span>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setMode('login')}
            style={tabStyle(mode === 'login')}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            style={tabStyle(mode === 'signup')}
          >
            Inscription
          </button>
        </div>

        <label style={labelStyle}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
          type="email"
          required
          style={inputStyle}
        />

        <label style={labelStyle}>Mot de passe</label>
        <div style={{ position: 'relative' }}>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type={showPwd ? 'text' : 'password'}
            required
            minLength={6}
            style={{ ...inputStyle, paddingRight: 96 }}
          />
          <button
            type="button"
            onClick={() => setShowPwd((s) => !s)}
            style={showBtnStyle}
          >
            {showPwd ? 'Masquer' : 'Afficher'}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            marginTop: 16,
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #333',
            background: '#fff',
            color: '#000',
            fontWeight: 700,
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {mode === 'signup' ? 'Créer le compte' : 'Se connecter'}
        </button>

        {error && (
          <div style={{ color: '#ff6b6b', marginTop: 12, fontSize: 14 }}>
            {error}
          </div>
        )}

        <p style={{ opacity: 0.6, fontSize: 12, marginTop: 16, lineHeight: 1.4 }}>
          En continuant, vous acceptez nos Conditions d’utilisation et notre Politique de confidentialité.
        </p>
      </form>
    </div>
  );
}

/* styles utilitaires */
function tabStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #333',
    background: active ? '#2b2b2b' : '#181818',
    color: active ? '#fff' : '#bbb',
    fontWeight: 700,
    cursor: 'pointer',
  };
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginTop: 10,
  marginBottom: 6,
  fontSize: 13,
  opacity: 0.9,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #333',
  background: '#0e0e0e',
  color: '#fff',
  outline: 'none',
};

const showBtnStyle: React.CSSProperties = {
  position: 'absolute',
  right: 6,
  top: 6,
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #333',
  background: '#1b1b1b',
  color: '#ddd',
  cursor: 'pointer',
  fontSize: 12,
};
