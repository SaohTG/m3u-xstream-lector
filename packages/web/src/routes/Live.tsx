import React from 'react';
import { api, getToken } from '../lib/api';

export default function Live() {
  const [rails, setRails] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string>('');
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const hlsRef = React.useRef<any>(null);
  const [current, setCurrent] = React.useState<{ id: string; title: string } | null>(null);

  const apiBase = (import.meta as any).env?.VITE_API_BASE || '';

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

  React.useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy?.();
        hlsRef.current = null;
      }
    };
  }, []);

  async function playChannel(id: string, title: string) {
    setErr('');
    setCurrent({ id, title });

    const manifestUrl = `${apiBase}/vod/live/${encodeURIComponent(id)}/hls.m3u8`;

    const video = videoRef.current!;
    if (!video) return;

    // Safari: HLS natif
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // On ne peut pas injecter l'Authorization header avec <video> natif.
      // Mais nos endpoints proxy sont sur le même host:port API et acceptent Bearer via XHR -> on utilise hls.js pour tous les navigateurs pour uniformiser.
    }

    // hls.js fallback / standard (Chrome/Firefox/Edge)
    const { default: Hls } = await import('hls.js');
    if (Hls.isSupported()) {
      // cleanup ancien lecteur
      if (hlsRef.current) {
        hlsRef.current.destroy?.();
        hlsRef.current = null;
      }
      const token = getToken();
      const hls = new Hls({
        // on peut activer low-latency si besoin
        // lowLatencyMode: true,
        xhrSetup: (xhr: XMLHttpRequest) => {
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        },
      });
      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(manifestUrl);
      });
      hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
        if (data?.fatal) {
          setErr('Erreur de lecture HLS');
        }
      });
    } else {
      // Dernier fallback (rare): tenter source direct (ne passera pas l’Authorization)
      video.src = manifestUrl;
      video.play().catch(() => setErr('Impossible de démarrer la chaîne'));
    }
  }

  return (
    <div style={{ display:'grid', gap:20 }}>
      {err ? <div style={{ color:'#ff7b7b' }}>{err}</div> : null}

      {/* Player */}
      <div style={{ border:'1px solid #222', borderRadius:12, overflow:'hidden', background:'#000' }}>
        <div style={{ padding:'8px 12px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <strong>{current?.title || 'Sélectionne une chaîne'}</strong>
          {current && (
            <button onClick={() => { setCurrent(null); if (videoRef.current) videoRef.current.pause(); }}
                    style={{ padding:'6px 10px', borderRadius:8, border:'1px solid #333', background:'transparent', color:'#fff' }}>
              Fermer
            </button>
          )}
        </div>
        <video
          ref={videoRef}
          controls
          autoPlay
          playsInline
          style={{ width:'100%', height:'min(70vh, 720px)', background:'#000' }}
        />
      </div>

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
