import React from 'react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';

type Movie = { id: string | number; title: string; poster?: string | null; year?: number | null; plot?: string | null; };
type Section = { key: string; title: string; items: Movie[] };

export default function Movies() {
  const [sections, setSections] = React.useState<Section[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');

  async function load() {
    setLoading(true); setErr('');
    try {
      const res = await api('/vod/movies/sections');
      setSections(Array.isArray(res) ? res : []);
    } catch (e:any) {
      setErr(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(()=>{ load(); }, []);

  if (loading) return <p>Chargement des films…</p>;
  if (err) return (
    <div>
      <p style={{color:'#f66'}}>Erreur : {err}</p>
      <button onClick={load}>Réessayer</button>
    </div>
  );
  if (!sections.length) return (
    <div>
      <p>Aucun film trouvé.</p>
      <button onClick={load}>Rafraîchir</button>
    </div>
  );

  return (
    <div style={{ display:'grid', gap:20 }}>
      {sections.map(sec => (
        <section key={sec.key}>
          <h3 style={{ margin:'6px 0 8px' }}>{sec.title}</h3>
          <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:4 }}>
            {sec.items.map(m => (
              <Link to={`/movie/${encodeURIComponent(String(m.id))}`} key={String(m.id)} style={{ textDecoration:'none', color:'inherit' }}>
                <article style={{ minWidth:180, width:180, background:'#121212', border:'1px solid #222', borderRadius:12, overflow:'hidden' }}>
                  <div style={{ aspectRatio:'16 / 9', background:'#1a1a1a' }}>
                    {m.poster ? (
                      <img src={m.poster} alt={m.title} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    ) : (
                      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',opacity:.6}}>Aucune image</div>
                    )}
                  </div>
                  <div style={{ padding:8 }}>
                    <div style={{ fontWeight:600, lineHeight:1.2 }}>{m.title}</div>
                    {m.year ? <div style={{ opacity:.65, fontSize:12 }}>{m.year}</div> : null}
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      ))}
      <div><button onClick={load}>Rafraîchir</button></div>
    </div>
  );
}
