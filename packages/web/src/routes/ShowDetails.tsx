import React from 'react';
import { api } from '../lib/api';
import { useParams } from 'react-router-dom';

type Season = { season: number; episodes: { id: string; number: number; title: string }[] };

export default function ShowDetails() {
  const { id } = useParams<{ id: string }>();
  const [details, setDetails] = React.useState<any>(null);
  const [seasons, setSeasons] = React.useState<Season[]>([]);
  const [err, setErr] = React.useState('');
  const [playing, setPlaying] = React.useState<{ url: string; title: string } | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [d, s] = await Promise.all([
          api(`/vod/shows/${id}/details`),
          api(`/vod/shows/${id}/seasons`),
        ]);
        if (!mounted) return;
        setDetails(d);
        setSeasons((s?.seasons || []).sort((a: any, b: any) => a.season - b.season));
      } catch (e: any) {
        setErr(e?.message || 'Erreur');
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  async function playEpisode(epId: string, title: string) {
    setErr('');
    try {
      const res = await api(`/vod/episodes/${epId}/url`);
      setPlaying({ url: res.url, title });
    } catch (e: any) {
      setErr(e?.message || 'Impossible de lancer la lecture');
    }
  }

  if (err) return <div style={{ color:'#ff7b7b' }}>{err}</div>;
  if (!details) return <div>Chargement…</div>;

  return (
    <div style={{ display:'grid', gap:16 }}>
      {/* Header */}
      <div style={{ display:'grid', gridTemplateColumns:'180px 1fr', gap:16 }}>
        <div style={{ width:180, borderRadius:12, overflow:'hidden', border:'1px solid #222', background:'#111' }}>
          <div style={{
            aspectRatio:'2/3',
            backgroundImage: details.poster ? `url(${details.poster})` : undefined,
            backgroundSize:'cover', backgroundPosition:'center'
          }} />
        </div>
        <div>
          <h2 style={{ margin:'0 0 8px' }}>{details.title}</h2>
          <div style={{ opacity:0.85, marginBottom:8 }}>
            {details.rating ? `Note : ${details.rating}/10` : '—'}
            {details.released ? ` · ${details.released}` : ''}
          </div>
          <p style={{ opacity:0.9 }}>{details.description || 'Aucune description'}</p>
        </div>
      </div>

      {/* Player (si en lecture) */}
      {playing && (
        <div style={{ border:'1px solid #222', borderRadius:12, overflow:'hidden', background:'#000' }}>
          <div style={{ padding:'8px 12px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <strong>{playing.title}</strong>
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

      {/* Saisons / Episodes */}
      <div style={{ display:'grid', gap:20 }}>
        {seasons.map((s) => (
          <div key={s.season}>
            <h3 style={{ margin:'8px 0' }}>Saison {s.season}</h3>
            <div style={{ display:'grid', gap:8 }}>
              {s.episodes.map((e) => (
                <div key={e.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 10px', border:'1px solid #222', borderRadius:10 }}>
                  <div style={{ width:36, textAlign:'right', opacity:0.8 }}>E{e.number}</div>
                  <div style={{ flex:1 }}>{e.title}</div>
                  <button onClick={() => playEpisode(e.id, `S${s.season}E${e.number} — ${e.title}`)}
                          style={{ padding:'6px 10px', borderRadius:8, border:'1px solid #333', background:'#fff', color:'#000', fontWeight:700 }}>
                    ▶ Lire
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
