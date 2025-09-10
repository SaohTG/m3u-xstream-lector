import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../lib/api';

export default function Auth() {
  const nav = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [err, setErr] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      // endpoint principal
      let r: any;
      try {
        r = await api('/auth/login', {
          method: 'POST',
          body: { email, password },
        });
      } catch (e: any) {
        // compat si ton API utilise /auth/signin
        if (String(e.message || '').startsWith('404')) {
          r = await api('/auth/signin', {
            method: 'POST',
            body: { email, password },
          });
        } else {
          throw e;
        }
      }

      const token =
        r?.access_token || r?.accessToken || r?.token || r?.jwt || null;
      if (!token) throw new Error('Réponse API login invalide (token manquant)');

      setToken(token);
      nav('/onboarding', { replace: true });
    } catch (e: any) {
      setErr(e?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '10vh auto', padding: 16, color: '#fff' }}>
      <h2>Connexion</h2>
      <form onSubmit={onLogin} style={{ display: 'grid', gap: 12 }}>
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }}
          required
        />
        <input
          type="password"
          placeholder="mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }}
          required
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #333', background: '#fff', color: '#000', fontWeight: 700 }}
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
        {err ? <div style={{ color: '#ff7b7b' }}>{err}</div> : null}
      </form>
    </div>
  );
}
