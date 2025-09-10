import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../lib/api';

export default function Auth() {
  const nav = useNavigate();
  const [mode, setMode] = useState<'login'|'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/signup';
      const res = await api(path, {
        method: 'POST',
        body: JSON.stringify({ email, password }), // ✅ JSON stringifié
      });
      const token = res?.access_token || res?.token;
      if (!token) throw new Error('Token manquant');
      setToken(token);                 // ✅ export présent
      nav('/onboarding', { replace: true });
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', color: '#fff' }}>
      <h1>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h1>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={()=>setMode('login')}  disabled={mode==='login'}>Connexion</button>
        <button onClick={()=>setMode('signup')} disabled={mode==='signup'}>Inscription</button>
      </div>
      <form onSubmit={submit} style={{ display:'grid', gap:8, marginTop:12 }}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Mot de passe" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button type="submit" disabled={loading}>{loading ? '...' : (mode==='login' ? 'Se connecter' : 'Créer')}</button>
      </form>
      {err && <div style={{ color:'#f55', marginTop:8 }}>{err}</div>}
    </div>
  );
}
