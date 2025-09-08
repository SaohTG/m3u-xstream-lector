import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../lib/api';

export default function Auth() {
  const [mode, setMode] = useState<'login'|'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string>('');
  const nav = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/signup';
      const res = await api(path, { method:'POST', body: { email, password } });
      // compat: accessToken | token
      const token = res?.accessToken || res?.token || res?.access || '';
      if (!token) throw new Error('Token manquant dans la réponse');
      setToken(token);
      nav('/onboarding');
    } catch (e: any) {
      setErr(e.message || 'Erreur');
    }
  }

  return (
    <div style={{maxWidth:420,margin:'64px auto'}}>
      <h1>Connexion</h1>
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        <button onClick={()=>setMode('login')} disabled={mode==='login'}>Se connecter</button>
        <button onClick={()=>setMode('signup')} disabled={mode==='signup'}>Créer un compte</button>
      </div>
      <form onSubmit={onSubmit} style={{display:'grid',gap:12}}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button type="submit">{mode==='login' ? 'Connexion' : 'Créer le compte'}</button>
        {err && <div style={{color:'tomato'}}>{err}</div>}
      </form>
      <p style={{opacity:.7,marginTop:8}}>OAuth/2FA peuvent être ajoutés ensuite.</p>
    </div>
  );
}
