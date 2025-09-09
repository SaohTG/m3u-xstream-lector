import React from 'react';
import { api, getToken, setToken } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function Onboarding() {
  const [mode, setMode] = React.useState<'m3u'|'xtream'>('m3u');
  const [m3u, setM3u] = React.useState('');
  const [base, setBase] = React.useState('');
  const [user, setUser] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState('');
  const nav = useNavigate();

  React.useEffect(() => {
    const t = getToken();
    if (!t) nav('/auth', { replace: true });
  }, [nav]);

  async function link() {
    setErr(''); setLoading(true);
    try {
      const body = mode === 'm3u'
        ? { type: 'M3U', url: m3u }
        : { type: 'XTREAM', base_url: base, username: user, password: pass };

      const res = await api('/playlists/link', { method: 'POST', body });

      // certains back renvoient un token rafraîchi après link : on l'accepte si présent
      const token =
        res?.accessToken ??
        res?.access_token ??
        res?.token ??
        null;
      if (token) setToken(token);

      nav('/movies', { replace: true });
    } catch (e: any) {
      // Astuce UX: si 401, proposer de se reconnecter
      const msg = String(e.message || '');
      if (msg.startsWith('401')) {
        setErr("Session expirée ou non authentifiée. Merci de vous reconnecter.");
      } else {
        setErr(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display:'grid', gap:16 }}>
      <h2>Onboarding</h2>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => setMode('m3u')}   style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #333', background: mode==='m3u' ? '#fff' : 'transparent', color: mode==='m3u' ? '#000' : '#fff' }}>Playlist M3U</button>
        <button onClick={() => setMode('xtream')}style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #333', background: mode==='xtream' ? '#fff' : 'transparent', color: mode==='xtream' ? '#000' : '#fff' }}>Compte Xtream</button>
      </div>

      {mode === 'm3u' ? (
        <div style={{ display:'grid', gap:8, maxWidth:600 }}>
          <label>URL M3U</label>
          <input value={m3u} onChange={e=>setM3u(e.target.value)} placeholder="https://.../list.m3u"
                 style={{ padding:8, borderRadius:8, border:'1px solid #333', background:'#0e0e0e', color:'#fff' }}/>
        </div>
      ) : (
        <div style={{ display:'grid', gap:8, maxWidth:600 }}>
          <label>Base URL Xtream</label>
          <input value={base} onChange={e=>setBase(e.target.value)} placeholder="http(s)://panel.exemple.tld"
                 style={{ padding:8, borderRadius:8, border:'1px solid #333', background:'#0e0e0e', color:'#fff' }}/>
          <label>Username</label>
          <input value={user} onChange={e=>setUser(e.target.value)}
                 style={{ padding:8, borderRadius:8, border:'1px solid #333', background:'#0e0e0e', color:'#fff' }}/>
          <label>Password</label>
          <input value={pass} onChange={e=>setPass(e.target.value)} type="password"
                 style={{ padding:8, borderRadius:8, border:'1px solid #333', background:'#0e0e0e', color:'#fff' }}/>
        </div>
      )}

      {err ? <div style={{ color:'#ff7b7b' }}>{err}</div> : null}

      <div style={{ display:'flex', gap:8 }}>
        <button disabled={loading} onClick={link}
                style={{ padding:'10px 12px', borderRadius:8, border:'1px solid #333', background:'#fff', color:'#000', fontWeight:700 }}>
          {loading ? '...' : 'Lier la source'}
        </button>
        <button onClick={() => { setToken(null); window.location.href = '/auth'; }}
                style={{ padding:'10px 12px', borderRadius:8, border:'1px solid #333', background:'transparent', color:'#fff' }}>
          Se reconnecter
        </button>
      </div>
    </div>
  );
}
