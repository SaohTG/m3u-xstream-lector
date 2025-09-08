import React, { useState } from 'react';
import { client } from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const { data } = await client.post('/auth/login', { email, password });
      localStorage.setItem('token', data.access_token);
      location.replace('/');
    } catch (e: any) {
      setErr(e?.message || 'Connexion impossible');
    }
  };

  return (
    <div style={{maxWidth:360, margin:'40px auto'}}>
      <h1>Connexion</h1>
      <form onSubmit={onSubmit} style={{display:'grid', gap:8}}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Mot de passe" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <div style={{color:'tomato', fontSize:12}}>{err}</div>}
        <button>Se connecter</button>
      </form>
      <p><a href="/register">Créer un compte</a></p>
    </div>
  );
}
