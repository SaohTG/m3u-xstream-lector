import React, { useState } from 'react';
import { login } from '../api';

export default function Login() {
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await login(email, password);
      window.location.href = '/'; // go home
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Connexion impossible');
    }
  };

  return (
    <div className="p-6 max-w-sm mx-auto">
      <h1 className="text-xl mb-4">Connexion</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input className="p-2 rounded bg-neutral-800" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="p-2 rounded bg-neutral-800" placeholder="Mot de passe" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <button className="btn">Se connecter</button>
        <a className="text-sm opacity-80" href="/register">Créer un compte</a>
      </form>
    </div>
  );
}
