"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      window.location.href = "/onboarding/xtream";
    } else {
      const data = await res.json().catch(()=>({message:"Erreur"}));
      setErr(data.message || "Erreur");
    }
  }

  return (
    <div className="container py-10 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Connexion</h1>
      {err && <div className="card border border-red-800 text-red-300 mb-4">{err}</div>}
      <form onSubmit={submit} className="space-y-3">
        <input placeholder="Email" className="input" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Mot de passe" type="password" className="input" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn w-full">Se connecter</button>
      </form>
      <p className="mt-4 text-sm text-zinc-400">
        Pas de compte ? <a href="/auth/register" className="link">Créer un compte</a>
      </p>
    </div>
  );
}
