import React, { useState } from 'react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

type LinkType = 'M3U' | 'XTREAM';

export default function Onboarding(){
  const [step, setStep] = useState(1);
  const [type, setType] = useState<LinkType>('M3U');
  const [m3uUrl, setM3uUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://85.31.239.110:8888'); // xtream-mock
  const [username, setUsername] = useState('u');
  const [password, setPassword] = useState('p');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const nav = useNavigate();

  async function linkPlaylist(e: React.FormEvent){
    e.preventDefault();
    setErr('');
    try {
      const body = type === 'M3U'
        ? { type:'M3U', url: m3uUrl }
        : { type:'XTREAM', baseUrl, username, password };
      await api('/playlists/link', { method:'POST', body });
      setOk(true);
      setTimeout(()=>nav('/movies'), 800);
    } catch (e:any) {
      setErr(e.message || 'Erreur');
    }
  }

  return (
    <div style={{maxWidth:720,margin:'48px auto',display:'grid',gap:16}}>
      <h1>Onboarding</h1>

      {step===1 && (
        <div>
          <h2>Étape 1 — Compte OK ✅</h2>
          <p>Votre compte est prêt. Passons au choix de la source.</p>
          <button onClick={()=>setStep(2)}>Continuer</button>
        </div>
      )}

      {step===2 && (
        <div>
          <h2>Étape 2 — Choisir M3U ou Xtream</h2>
          <div style={{display:'flex',gap:12,margin:'12px 0'}}>
            <button onClick={()=>{setType('M3U'); setStep(3);}}>M3U</button>
            <button onClick={()=>{setType('XTREAM'); setStep(3);}}>Xtream</button>
          </div>
          <button onClick={()=>setStep(1)}>Retour</button>
        </div>
      )}

      {step===3 && (
        <form onSubmit={linkPlaylist} style={{display:'grid',gap:12}}>
          <h2>Étape 3 — Lier la source ({type})</h2>
          {type==='M3U' ? (
            <>
              <input placeholder="URL M3U" value={m3uUrl} onChange={e=>setM3uUrl(e.target.value)} required />
            </>
          ) : (
            <>
              <input placeholder="Base URL Xtream" value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} required />
              <input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} required />
              <input placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
            </>
          )}
          <div style={{display:'flex',gap:8}}>
            <button type="button" onClick={()=>setStep(2)}>Retour</button>
            <button type="submit">Lier et importer</button>
          </div>
          {err && <div style={{color:'tomato'}}>{err}</div>}
          {ok && <div style={{color:'green'}}>Import démarré ! Redirection…</div>}
        </form>
      )}
    </div>
  );
}
