import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../lib/api';

export default function Auth() {
  const nav = useNavigate();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/signup';

      const res = await api(path, {
        method: 'POST',
        body: JSON.stringify({ email, password }), // JSON correct
      });

      // Accepte plusieurs formes de réponse (access_token|accessToken|token|jwt ou texte JWT)
      const token =
        res?.access_token ??
        res?.accessToken ??
        res?.token ??
        res?.jwt ??
        res?.data?.access_token ??
        (typeof res === 'string' && /^eyJ[A-Za-z0-9_\-]+\./.test(res) ? res : null);

      if (!token) {
        // Aide au debug côté console
        // eslint-disable-next-line no-console
        console.debug('Réponse /auth:', res);
        throw new Error('Token manquant');
      }

      setToken(token);
      nav('/onboarding', { replace: true });
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#0b0b0b', color: '#fff' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: 16 }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 20 }}>NovaStream</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>— Authentification</div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setErr(null); }}
            disabled={mode === 'login'}
            style={tabStyle(mode === 'login')}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErr(null); }}
            disabled={mode === 'signup'}
            style={tabStyle(mode === 'signup')}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
          <label style={labelStyle}>
            <div style={labelTextStyle}>Email</div>
            <input
              required
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              autoComplete="username"
            />
          </label>

          <label style={labelStyle}>
            <div style={labelTextStyle}>Mot de passe</div>
            <div style={{ position: 'relative' }}>
              <input
                required
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: 84 }}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                style={showBtnStyle}
                title={showPwd ? 'Masquer' : 'Afficher'}
              >
                {showPwd ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              cursor: 'pointer',
              fontWeight: 600,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
          </button>

          {err && (
            <div style={{ color: '#ff6b6b', fontSize: 13, marginTop: 6 }}>
              {err}
            </div>
          )}

          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8, lineHeight: 1.5 }}>
            En continuant, vous acceptez nos Conditions d’utilisation et notre Politique de confidentialité.
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- styles utilitaires ---------- */

const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  background: active ? '#1f1f1f' : 'transparent',
  color: '#fff',
  border: '1px solid #333',
  borderRadius: 8,
  padding: '8px 10px',
  cursor: active ? 'default' : 'pointer',
});

const labelStyle: React.CSSProperties = { display: 'grid', gap: 6 };
const labelTextStyle: React.CSSProperties = { fontSize: 13, opacity: 0.85 };

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #333',
  background: '#121212',
  color: '#fff',
  outline: 'none',
};

const showBtnStyle: React.CSSProperties = {
  position: 'absolute',
  right: 6,
  top: 6,
  height: 30,
  padding: '0 10px',
  background: '#222',
  color: '#fff',
  border: '1px solid #333',
  borderRadius: 6,
  cursor: 'pointer',
};
