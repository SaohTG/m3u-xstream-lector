import React, { useState } from 'react';
import { register } from '../api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(email, password);
      location.replace('/');
    } catch (e: any) {
      setErr(e.message || 'Inscription impossible');
    }
  };

  return (
    <div style={{maxWidth:360, margin:'40px auto'}}>
      <h1>Inscription</h1>
      <form onSubmit={onSubmit} style={{display:'grid', gap:8}}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Mot de passe" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <div style={{color:'tomato', fontSize:12}}>{err}</div>}
        <button>S’inscrire</button>
      </form>
      <p><a href="/login">J’ai déjà un compte</a></p>
    </div>
  );
}
