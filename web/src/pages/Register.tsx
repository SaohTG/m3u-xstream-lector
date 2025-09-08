import React, { useState } from 'react';
import { register } from '../api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await register(email, password, displayName);
      window.location.href = '/';
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Inscription impossible');
    }
  };

  return (
    <div className="p-6 max-w-sm mx-auto">
      <h1 className="text-xl mb-4">Créer un compte</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input className="p-2 rounded bg-neutral-800" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="p-2 rounded bg-neutral-800" placeholder="Nom affiché (optionnel)" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
        <input className="p-2 rounded bg-neutral-800" placeholder="Mot de passe" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <button className="btn">S’inscrire</button>
        <a className="text-sm opacity-80" href="/login">J’ai déjà un compte</a>
      </form>
    </div>
  );
}
