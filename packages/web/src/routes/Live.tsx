import React from 'react';
import { api } from '../lib/api';

type Channel = {
  id: string | number;
  name: string;
  logo?: string | null;
  url?: string | null;
};

export default function Live() {
  const [items, setItems] = React.useState<Channel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string>('');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const res = await api('/live/channels');
      setItems(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setErr(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  if (loading) return <p>Chargement des chaînes…</p>;
  if (err) return (
    <div>
      <p style={{ color: '#f66' }}>Erreur : {err}</p>
      <button onClick={load}>Réessayer</button>
    </div>
  );
  if (!items.length) return (
    <div>
      <p>Aucune chaîne trouvée. Vérifie ta playlist dans l’<a href="/onboarding">onboarding</a>.</p>
      <button onClick={load}>Rafraîchir</button>
    </div>
  );

  return (
    <section>
      <h2 style={{ margin: '8px 0 12px' }}>TV en direct ({items.length})</h2>
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))',
        gap:12
      }}>
        {items.map(c => (
          <article key={String(c.id)} style={{ background:'#121212', border:'1px solid #222', borderRadius:12, padding:10 }}>
            <div style={{ aspectRatio:'16 / 9', background:'#191919', marginBottom:8, display:'flex',alignItems:'center',justifyContent:'center', overflow:'hidden' }}>
              {c.logo
                ? <img src={c.logo} alt={c.name} style={{ maxWidth:'100%', maxHeight:'100%' }} />
                : <div style={{opacity:.6}}>{c.name}</div>}
            </div>
            <div style={{ fontWeight:600, lineHeight:1.2 }}>{c.name}</div>
          </article>
        ))}
      </div>
      <div style={{ marginTop:12 }}>
        <button onClick={load}>Rafraîchir</button>
      </div>
    </section>
  );
}
