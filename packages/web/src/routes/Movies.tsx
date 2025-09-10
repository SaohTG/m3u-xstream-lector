import React from 'react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';

export default function Movies() {
  const [rails, setRails] = React.useState<any[]>([]);
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await api('/vod/movies/rails');
        if (mounted) setRails(r || []);
      } catch (e: any) {
        setErr(e?.message || 'Erreur');
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (err) return <div style={{ color:'#ff7b7b' }}>{err}</div>;

  return (
    <div style={{ display:'grid', gap:24 }}>
      {rails.map((rail) => (
        <div key={rail.key}>
          <h3 style={{ margin:'8px 0' }}>{rail.title}</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:12 }}>
            {rail.items.map((m: any) => (
              <Link key={m.id} to={`/movie/${m.id}`} style={{ textDecoration:'none', color:'inherit' }}>
                <div style={{ background:'#111', border:'1px solid #222', borderRadius:12, overflow:'hidden' }}>
                  <div style={{ aspectRatio:'2/3', background:'#222', backgroundImage: m.poster ? `url(${m.poster})` : undefined, backgroundSize:'cover', backgroundPosition:'center' }} />
                  <div style={{ padding:8, fontSize:13 }}>
                    {m.title}{m.year ? ` · ${m.year}` : ''}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
