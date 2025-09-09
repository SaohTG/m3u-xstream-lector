import React from 'react';
import { api, setToken } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [mode, setMode] = React.useState<'login'|'signup'>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState('');
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/signup';
      const res = await api(path, { method: 'POST', body: { email, password } });

      // Accepte plusieurs formats possibles depuis l'API
      const token =
        res?.accessToken ??
        res?.access_token ??
        res?.token ??
        null;

      if (!token) {
        throw new Error('Token manquant dans la réponse API');
      }

      setToken(token);
      nav('/onboarding', { replace: true });
    } catch (e: any) {
      setErr(e?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:'100dvh', display:'grid', placeItems:'center', background:'#0b0b0b', color:'#fff' }}>
      <form onSubmit={submit} style={{ width:320, display:'grid', gap:12, background:'#121212', border:'1px solid #222', borderRadius:12, padding:16 }}>
        <h2 style={{ margin:'0 0 8px' }}>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h2>

        <label style={{ display:'grid', gap:6 }}>
          <span>Email</span>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required
                 style={{ padding:8, borderRadius:8, border:'1px solid #333', background:'#0e0e0e', color:'#fff' }}/>
        </label>

        <label style={{ display:'grid', gap:6 }}>
          <span>Mot de passe</span>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required
                 style={{ padding:8, borderRadius:8, border:'1px solid #333', background:'#0e0e0e', color:'#fff' }}/>
        </label>

        {err ? <div style={{ color:'#ff7b7b', fontSize:13 }}>{err}</div> : null}

        <button disabled={loading} type="submit"
                style={{ padding:'10px 12px', borderRadius:8, border:'1px solid #333', background:'#fff', color:'#000', fontWeight:700 }}>
          {loading ? '...' : (mode === 'login' ? 'Se connecter' : 'Créer le compte')}
        </button>

        <button type="button"
                onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
                style={{ padding:'8px 10px', borderRadius:8, border:'1px solid #333', background:'transparent', color:'#fff' }}>
          {mode === 'login' ? "Pas de compte ? S'inscrire" : "Déjà inscrit ? Se connecter"}
        </button>
      </form>
    </div>
  );
}
