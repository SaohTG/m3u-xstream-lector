import React from 'react';
import { api } from '../lib/api';

export default function Live() {
  const [rails, setRails] = React.useState<any[]>([]);
  const [err, setErr] = React.useState('');
  const [playing, setPlaying] = React.useState<{ url: string; title: string } | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await api('/vod/live/rails');
        if (mounted) setRails(r || []);
      } catch (e: any) {
        setErr(e?.message || 'Erreur');
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function playChannel(id: string, title: string) {
    setErr('');
    try {
      const res = await api(`/vod/live/${id}/url`);
      setPlaying({ url: res.url, title });
    } catch (e: any) {
      setErr(e?.message || 'Impossible de lancer la chaîne');
    }
  }

  return (
    <div style={{ display:'grid', gap:20 }}>
      {err ? <div style={{ color:'#ff7b7b' }}>{err}</div> : null}

      {/* Player */}
      {playing && (
        <div style={{ border:'1px solid #222', borderRadius:12, overflow:'hidden', background:'#000' }}>
          <div style={{ padding:'8px 12px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <strong>{playing.title}</strong>
            <button onClick={() => setPlaying(null)} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid #333', background:'transparent', color:'#fff' }}>Fermer</button>
          </div>
          {/* HLS natif (Safari) — pour Chrome/Firefox on ajoutera hls.js si besoin */}
          <video
            controls
            autoPlay
            playsInline
            style={{ width:'100%', height:'min(70vh, 720px)', background:'#000' }}
            src={playing.url}
            crossOrigin="anonymous"
          />
        </div>
      )}

      {/* Rails par catégories */}
      {rails.map((rail) => (
        <div key={rail.key}>
          <h3 style={{ margin:'8px 0' }}>{rail.title}</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:12 }}>
            {rail.items.map((ch: any) => (
              <button
                key={ch.id}
                onClick={() => playChannel(ch.id, ch.title)}
                style={{ textAlign:'left', background:'transparent', color:'#fff', border:'none', cursor:'pointer' }}
                title="Lire la chaîne"
              >
                <div style={{ background:'#111', border:'1px solid #222', borderRadius:12, overflow:'hidden' }}>
                  <div style={{
                    aspectRatio:'16/9',
                    background:'#222',
                    backgroundImage: ch.poster ? `url(${ch.poster})` : undefined,
                    backgroundSize:'cover', backgroundPosition:'center'
                  }} />
                  <div style={{ padding:8, fontSize:13 }}>{ch.title}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
