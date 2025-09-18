"use client";
import { useState } from "react";

export default function XtreamLinkPage() {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("80");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Test de connexion...");
    const res = await fetch("/api/xtream/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, port, username, password }),
    });
    const data = await res.json().catch(()=>({ok:false,message:"Erreur"}));
    if (res.ok) {
      setStatus("Compte Xtream lié ! Redirection ...");
      window.location.href = "/movies";
    } else {
      setStatus(data.message || "Impossible de lier le compte.");
    }
  }

  return (
    <div className="container py-10 max-w-lg">
      <h1 className="text-2xl font-bold mb-2">Lier votre compte Xtream</h1>
      <p className="text-zinc-400 mb-6">Saisissez vos identifiants. Nous chiffrons et stockons ces informations de manière sécurisée.</p>
      <form onSubmit={submit} className="space-y-3">
        <input className="input" placeholder="Host (ex: demo.xtream.host)" value={host} onChange={e=>setHost(e.target.value)} />
        <input className="input" placeholder="Port (ex: 80)" value={port} onChange={e=>setPort(e.target.value)} />
        <input className="input" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
        <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn w-full">Lier et tester</button>
      </form>
      {status && <div className="mt-4 text-sm text-zinc-300">{status}</div>}
    </div>
  );
}
