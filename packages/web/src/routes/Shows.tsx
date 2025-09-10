import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type RailItem = { id: string; title: string; poster?: string | null; year?: number | null };
type Rail = { key: string; title: string; items: RailItem[] };

export default function Shows() {
  const [rails, setRails] = useState<Rail[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api('/vod/shows/rails')
      .then((data) => { if (mounted) setRails(data); })
      .catch((e) => setErr(String(e?.message || e)));
    return () => { mounted = false; };
  }, []);

  if (err) return <div style={{ color: '#f55' }}>Erreur: {err}</div>;
  if (!rails) return <div>Chargement…</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {rails.map((rail) => (
        <section key={rail.key}>
          <h2 style={{ margin:'8px 0' }}>{rail.title}</h2>
          <div style={{ display:'grid', gridAutoFlow:'column', gridAutoColumns:'180px', gap:12, overflowX:'auto', paddingBottom:6 }}>
            {rail.items.map((it) => (
              <Link
                key={it.id}
                to={`/shows/${encodeURIComponent(it.id)}`}
                style={{ display:'block', textDecoration:'none', color:'#fff' }}
              >
                <div style={{ width:180 }}>
                  <div
                    style={{
                      width:'100%', aspectRatio:'16/9', borderRadius:12, overflow:'hidden',
                      background:'#111', border:'1px solid #222',
                      display:'flex', alignItems:'center', justifyContent:'center'
                    }}
                  >
                    {it.poster
                      ? <img src={it.poster} alt={it.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : <div style={{ opacity:0.6, fontSize:12 }}>Poster</div>
                    }
                  </div>
                  <div style={{ marginTop:6, fontSize:14, lineHeight:1.25, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
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
