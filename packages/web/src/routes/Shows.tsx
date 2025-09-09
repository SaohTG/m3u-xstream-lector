import React from 'react';
import { api } from '../lib/api';

type Show = {
  id: string | number;
  title: string;
  poster?: string | null;
  plot?: string | null;
};

export default function Shows() {
  const [items, setItems] = React.useState<Show[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string>('');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const res = await api('/vod/shows');
      setItems(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setErr(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  if (loading) return <p>Chargement des séries…</p>;
  if (err) return (
    <div>
      <p style={{ color: '#f66' }}>Erreur : {err}</p>
      <button onClick={load}>Réessayer</button>
    </div>
  );
  if (!items.length) return (
    <div>
      <p>Aucune série trouvée. Configure d’abord ta source dans l’<a href="/onboarding">onboarding</a>.</p>
      <button onClick={load}>Rafraîchir</button>
    </div>
  );

  return (
    <section>
      <h2 style={{ margin: '8px 0 12px' }}>Séries ({items.length})</h2>
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))',
        gap:12
      }}>
        {items.map(s => (
          <article key={String(s.id)} style={{ background:'#121212', border:'1px solid #222', borderRadius:12, overflow:'hidden' }}>
            <div style={{ aspectRatio:'16 / 9', background:'#191919' }}>
              {s.poster
                ? <img src={s.poster} alt={s.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',opacity:.6}}>Aucune image</div>}
            </div>
            <div style={{ padding:10 }}>
              <div style={{ fontWeight:600, lineHeight:1.2 }}>{s.title}</div>
              {s.plot ? <div style={{ opacity:.7, fontSize:12, marginTop:6 }}>{s.plot}</div> : null}
            </div>
          </article>
        ))}
      </div>
      <div style={{ marginTop:12 }}>
        <button onClick={load}>Rafraîchir</button>
      </div>
    </section>
  );
}
