import React from 'react';
import { api } from '../lib/api';
import { useParams } from 'react-router-dom';

export default function MovieDetails() {
  const { id } = useParams<{ id: string }>();
  const [details, setDetails] = React.useState<any>(null);
  const [err, setErr] = React.useState('');
  const [playing, setPlaying] = React.useState<{ url: string } | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Compatible avec l’alias /vod/movies/:id
        const d = await api(`/vod/movies/${id}`);
        if (!mounted) return;
        setDetails(d);
      } catch (e: any) {
        setErr(e?.message || 'Erreur');
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  async function play() {
    setErr('');
    try {
      const res = await api(`/vod/movies/${id}/url`);
      setPlaying({ url: res.url });
    } catch (e: any) {
      setErr(e?.message || 'Impossible de lancer la lecture');
    }
  }

  if (err) return <div style={{ color:'#ff7b7b' }}>{err}</div>;
  if (!details) return <div>Chargement…</div>;

  return (
    <div style={{ display:'grid', gap:16 }}>
      {/* Header */}
      <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:16 }}>
        <div style={{ width:240, borderRadius:12, overflow:'hidden', border:'1px solid #222', background:'#111' }}>
          <div style={{
            aspectRatio:'2/3',
            backgroundImage: details.poster ? `url(${details.poster})` : undefined,
            backgroundSize:'cover', backgroundPosition:'center'
          }} />
        </div>
        <div>
          <h2 style={{ margin:'0 0 8px' }}>
            {details.title}{details.year ? ` · ${details.year}` : ''}
          </h2>
          <div style={{ opacity:0.85, marginBottom:8 }}>
            {details.rating ? `Note : ${details.rating}/10` : '—'}
            {details.released ? ` · Sortie: ${details.released}` : ''}
          </div>
          <p style={{ opacity:0.9 }}>{details.description || 'Aucune description'}</p>
          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button onClick={play}
                    style={{ padding:'10px 14px', borderRadius:8, border:'1px solid #333', background:'#fff', color:'#000', fontWeight:700 }}>
              ▶ Lire le film
            </button>
          </div>
        </div>
      </div>

      {/* Player */}
      {playing && (
        <div style={{ border:'1px solid #222', borderRadius:12, overflow:'hidden', background:'#000' }}>
          <div style={{ padding:'8px 12px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <strong>Lecture</strong>
            <button onClick={() => setPlaying(null)} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid #333', background:'transparent', color:'#fff' }}>Fermer</button>
          </div>
          <video
            controls
            autoPlay
            style={{ width:'100%', height:'min(70vh, 720px)', background:'#000' }}
            src={playing.url}
          />
        </div>
      )}
    </div>
  );
}
