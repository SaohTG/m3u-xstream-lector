import React from 'react';
import { api, getToken } from '../lib/api';

export default function Live() {
  const [rails, setRails] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string>('');
  const [current, setCurrent] = React.useState<{ id: string; title: string } | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const hlsRef = React.useRef<any>(null);

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

    try {
      const { default: Hls } = await import('hls.js');
      if (Hls.isSupported()) {
        if (hlsRef.current) {
          try { hlsRef.current.destroy?.(); } catch {}
          hlsRef.current = null;
        }
        const token = getToken();
        const hls = new Hls({
          xhrSetup: (xhr: XMLHttpRequest) => {
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          },
          maxBufferLength: 30,
          liveDurationInfinity: true,
        });
        hlsRef.current = hls;
        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(manifestUrl));
        hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
          console.warn('[HLS] error', data);
          if (!data?.fatal) return;
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              try { hls.startLoad(0); } catch {}
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              try { hls.recoverMediaError(); } catch {}
              break;
            default:
              setErr('Erreur de lecture HLS');
              try { hls.destroy(); } catch {}
              hlsRef.current = null;
              break;
          }
        });
      } else {
        video.src = manifestUrl;
        await video.play();
      }
    } catch (e: any) {
      console.error('HLS loader error', e);
      setErr('Erreur de lecteur HLS');
    }
  }

  return (
    <div style={{ display:'grid', gap:20 }}>
      {err ? <div style={{ color:'#ff7b7b' }}>{err}</div> : null}

      <div style={{ border:'1px solid #222', borderRadius:12, overflow:'hidden', background:'#000' }}>
        <div style={{ padding:'8px 12px', borderBottom:'1px solid #222', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <strong>{current?.title || 'Sélectionne une chaîne'}</strong>
          {current && (
            <button
              onClick={() => { setCurrent(null); if (videoRef.current) videoRef.current.pause(); }}
              style={{ padding:'6px 10px', borderRadius:8, border:'1px solid #333', background:'transparent', color:'#fff' }}
            >
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
