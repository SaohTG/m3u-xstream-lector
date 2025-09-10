import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';

type RailItem = { id: string; title: string; poster?: string | null; year?: number | null };
type Rail = { key: string; title: string; items: RailItem[] };

export default function Movies() {
  const nav = useNavigate();
  const [rails, setRails] = useState<Rail[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api('/vod/movies/rails')
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
        Aucun film à afficher. Liez d’abord une source dans l’{' '}
        <Link to="/onboarding" style={{ color: '#9cf' }}>Onboarding</Link>.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {rails.map((rail) => (
        <section key={rail.key}>
          <h2 style={{ margin: '8px 0' }}>{rail.title}</h2>
          <div style={{ display:'grid', gridAutoFlow:'column', gridAutoColumns:'180px', gap:12, overflowX:'auto', paddingBottom:6 }}>
            {rail.items.map((it) => (
              <Link key={it.id} to={`/movies/${encodeURIComponent(it.id)}`} style={{ textDecoration:'none', color:'#fff' }}>
                <div style={{ width:180 }}>
                  <div style={{ width:'100%', aspectRatio:'16/9', borderRadius:12, overflow:'hidden', background:'#111', border:'1px solid #222', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {it.poster
                      ? <img src={it.poster} alt={it.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : <div style={{ opacity:0.6, fontSize:12 }}>Poster</div>}
                  </div>
                  <div style={{ marginTop:6, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {it.title}{it.year ? ` (${it.year})` : ''}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
