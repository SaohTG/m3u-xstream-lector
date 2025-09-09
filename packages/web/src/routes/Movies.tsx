import React from 'react';
import { api } from '../lib/api';

type Rail = { key: string; title: string; items: any[] };

export default function Movies() {
  const [rails, setRails] = React.useState<Rail[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');

  async function load() {
    setLoading(true); setErr('');
    try {
      const res = await api('/vod/movies/rails');
      setRails(res?.rails || []);
    } catch (e:any) {
      setErr(e.message || 'Erreur');
    } finally { setLoading(false); }
  }

  React.useEffect(() => { load(); }, []);

  if (loading) return <p>Chargement des films…</p>;
  if (err) return <div><p style={{color:'#f66'}}>Erreur : {err}</p><button onClick={load}>Réessayer</button></div>;
  if (!rails.length) return <div><p>Aucun film trouvé.</p><button onClick={load}>Rafraîchir</button></div>;

  return (
    <section style={{display:'grid', gap:24}}>
      {rails.map(r => (
        <div key={r.key}>
          <h3 style={{margin:'4px 0 10px'}}>{r.title}</h3>
          <div style={{display:'flex', gap:12, overflowX:'auto', paddingBottom:6}}>
            {r.items.map((m:any) => (
              <article key={String(m.id)} style={{ minWidth: 180, width: 180, background:'#121212', border:'1px solid #222', borderRadius:12, overflow:'hidden' }}>
                <div style={{ aspectRatio:'16 / 9', background:'#191919' }}>
                  {m.poster
                    ? <img src={m.poster} alt={m.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',opacity:.6}}>Aucune image</div>}
                </div>
                <div style={{ padding:8 }}>
                  <div style={{ fontWeight:600, lineHeight:1.2, fontSize:14 }}>{m.title}</div>
                  {m.year ? <div style={{ opacity:.7, fontSize:12 }}>{m.year}</div> : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
