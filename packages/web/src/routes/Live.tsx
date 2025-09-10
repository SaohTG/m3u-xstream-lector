import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';

type RailItem = { id: string; title: string; poster?: string | null; category?: string | null };
type Rail = { key: string; title: string; items: RailItem[] };

export default function Live() {
  const nav = useNavigate();
  const [rails, setRails] = useState<Rail[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api('/vod/live/rails')
      .then((data) => {
        if (!mounted) return;
        setRails(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((e: any) => {
        const status = (e as ApiError)?.status;
        const msg = e?.message || String(e);
        if (status === 401) { nav('/auth', { replace: true }); return; }
        if (status === 400) { nav('/onboarding', { replace: true }); return; }
        setError(`${status ?? ''} ${msg}`);
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [nav]);

  if (loading) return <div style={{ color: '#fff', padding: 16 }}>Chargement…</div>;
  if (error)   return <div style={{ color: '#ff6b6b', padding: 16 }}>Erreur: {error}</div>;

  if (!rails || rails.length === 0) {
    return (
      <div style={{ color: '#fff', padding: 16 }}>
        Aucune chaîne à afficher. Liez d’abord une source dans l’Onboarding.
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24, color:'#fff' }}>
      {rails.map(rail => (
        <section key={rail.key}>
          <h2 style={{ margin: '8px 0' }}>{rail.title}</h2>
          <div style={{ display:'grid', gridAutoFlow:'column', gridAutoColumns:'200px', gap:12, overflowX:'auto', paddingBottom:6 }}>
            {rail.items.map(ch => (
              <div key={ch.id} style={{ width:200 }}>
                <div style={{ width:'100%', aspectRatio:'16/9', borderRadius:12, overflow:'hidden', background:'#111', border:'1px solid #222', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {ch.poster ? <img src={ch.poster} alt={ch.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <div style={{ opacity:0.6, fontSize:12 }}>Logo</div>}
                </div>
                <div style={{ marginTop:6, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {ch.title}
                </div>
                <div style={{ fontSize:12, opacity:0.7 }}>{ch.category || ''}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
