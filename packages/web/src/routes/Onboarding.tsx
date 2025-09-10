import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Onboarding() {
  const nav = useNavigate();
  const [mode, setMode] = useState<'M3U' | 'XTREAM'>('XTREAM');
  const [m3uUrl, setM3uUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      if (mode === 'M3U') {
        if (!/^https?:\/\//i.test(m3uUrl)) throw new Error('URL M3U invalide');
        await api('/playlists/link', {
          method: 'POST',
          body: JSON.stringify({ type: 'M3U', url: m3uUrl }),
        });
      } else {
        if (!/^https?:\/\//i.test(baseUrl)) throw new Error('Base URL Xtream invalide');
        await api('/playlists/link', {
          method: 'POST',
          body: JSON.stringify({ type: 'XTREAM', baseUrl, username, password }),
        });
      }
      nav('/movies', { replace: true });
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', color: '#fff' }}>
      <h1>Onboarding</h1>
      <p>Liez votre source IPTV (M3U ou Xtream).</p>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <button onClick={()=>setMode('XTREAM')} disabled={mode==='XTREAM'}>Xtream</button>
        <button onClick={()=>setMode('M3U')}     disabled={mode==='M3U'}>M3U</button>
      </div>
      <form onSubmit={submit} style={{ display:'grid', gap:8 }}>
        {mode === 'M3U' ? (
          <input placeholder="URL M3U" value={m3uUrl} onChange={e=>setM3uUrl(e.target.value)} />
        ) : (
          <>
            <input placeholder="Base URL (ex: https://host:port)" value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} />
            <input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
            <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          </>
        )}
        <button type="submit" disabled={loading}>{loading ? 'Lien…' : 'Lier'}</button>
        {err && <div style={{ color:'#f55' }}>{err}</div>}
      </form>
    </div>
  );
}
