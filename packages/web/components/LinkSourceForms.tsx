'use client';
import { useState } from 'react';
import { api } from '@lib/api';

export default function LinkSourceForms() {
  const [m3u, setM3u] = useState('');
  const [host, setHost] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState<string>('');

  async function linkM3U() {
    setMsg('');
    try {
      const { data } = await api.post('/api/playlists/link', { type: 'm3u', url: m3u });
      setMsg('M3U activée: ' + (data.name || data.url));
    } catch (e: any) { setMsg('Erreur M3U: ' + (e?.response?.data?.message || e.message)); }
  }
  async function linkXtream() {
    setMsg('');
    try {
      const { data } = await api.post('/api/playlists/link', { type: 'xtream', base_url: host, username: user, password: pass });
      setMsg('Xtream activée: ' + (data.url));
    } catch (e: any) { setMsg('Erreur Xtream: ' + (e?.response?.data?.message || e.message)); }
  }
  async function unlink() {
    await api.post('/api/playlists/unlink');
    setMsg('Source désactivée.');
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-2 rounded-lg border border-white/10 p-4">
        <h3 className="font-semibold">Lier M3U</h3>
        <input className="w-full px-3 py-2 rounded bg-zinc-900 border border-white/10" placeholder="https://..." value={m3u} onChange={e=>setM3u(e.target.value)} />
        <button onClick={linkM3U} className="px-4 py-2 bg-white/10 rounded hover:bg-white/20">Activer</button>
      </div>
      <div className="space-y-2 rounded-lg border border-white/10 p-4">
        <h3 className="font-semibold">Lier Xtream</h3>
        <input className="w-full px-3 py-2 rounded bg-zinc-900 border border-white/10" placeholder="host (ex: noos.vip)" value={host} onChange={e=>setHost(e.target.value)} />
        <input className="w-full px-3 py-2 rounded bg-zinc-900 border border-white/10" placeholder="username" value={user} onChange={e=>setUser(e.target.value)} />
        <input className="w-full px-3 py-2 rounded bg-zinc-900 border border-white/10" placeholder="password" type="password" value={pass} onChange={e=>setPass(e.target.value)} />
        <button onClick={linkXtream} className="px-4 py-2 bg-white/10 rounded hover:bg-white/20">Activer</button>
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <button onClick={unlink} className="px-4 py-2 bg-red-600/80 rounded hover:bg-red-600">Désactiver source</button>
        {msg ? <span className="text-sm opacity-80">{msg}</span> : null}
      </div>
    </div>
  );
}
