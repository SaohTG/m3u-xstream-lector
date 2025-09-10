import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Hls from 'hls.js';
import { api, getApiBase, getToken } from '../lib/api';
import { attachProgressReporter } from '../lib/progress';

type Movie = {
  id: string;
  title: string;
  description?: string;
  rating?: number | null;
  poster?: string | null;
  backdrop?: string | null;
  year?: number | null;
  genres?: string[];
};

function upgradeBackdropQuality(u?: string | null): string | null {
  if (!u) return null;
  try {
    if (u.includes('image.tmdb.org')) {
      return u.replace(/\/w\d+\//, '/original/').replace(/\/t\/p\/w\d+\//, '/t/p/original/');
    }
    return u;
  } catch { return u || null; }
}

export default function MovieDetails() {
  const { movieId = '' } = useParams();
  const [data, setData] = useState<Movie | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!movieId) return;
    let mounted = true;
    (async () => {
      const d = await api(`/vod/movies/${encodeURIComponent(movieId)}/details`);
      if (!mounted) return;
      setData(d);
      const base = getApiBase();
      const t = getToken();
      // URL du manifeste proxifié (+ token en query pour Safari/native)
      const url = `${base}/vod/movies/${encodeURIComponent(movieId)}/hls${t ? `?t=${encodeURIComponent(t)}` : ''}`;
      setHlsUrl(url);
    })().catch(console.error);
    return () => { mounted = false; };
  }, [movieId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl || !movieId) return;
    let hls: Hls | null = null;
    let cleanup: (() => void) | null = null;

    const onLoaded = () => {
      if (!cleanup) cleanup = attachProgressReporter(video, { kind: 'MOVIE', refId: movieId });
    };

    // Utilise Hls.js partout pour garantir l'envoi du header Authorization aux requêtes XHR
    hls = new Hls({
      enableWorker: true,
      xhrSetup: (xhr) => {
        const t = getToken();
        if (t) xhr.setRequestHeader('Authorization', `Bearer ${t}`);
      },
    });
    hls.attachMedia(video);
    hls.on(Hls.Events.MEDIA_ATTACHED, () => { hls!.loadSource(hlsUrl); });

    video.addEventListener('loadedmetadata', onLoaded);
    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      if (cleanup) cleanup();
      if (hls) hls.destroy();
    };
  }, [movieId, hlsUrl]);

  if (!movieId) return <div style={{ padding: 16, color:'#fff' }}>ID de film manquant.</div>;
  if (!data) return <div style={{ padding: 16, color:'#fff' }}>Chargement…</div>;

  const backdropHQ = upgradeBackdropQuality(data.backdrop);

  return (
    <div style={{ color: '#fff' }}>
      <div style={{ position:'relative', borderRadius:12, overflow:'hidden', border:'1px solid #222' }}>
        <div style={{ width:'100%', minHeight:320, background: backdropHQ ? `center/cover url(${backdropHQ})` : '#101010' }} />
        <div style={{ position:'absolute', inset:0, background: `
          linear-gradient(180deg, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.75) 100%),
          linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.15) 100%)` }} />
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'flex-end' }}>
          <div style={{ display:'flex', gap:16, padding:16, width:'100%' }}>
            <div style={{ width:220, flex:'0 0 auto' }}>
              <div style={{ width:'100%', aspectRatio:'2/3', background:'#111', border:'1px solid #222', borderRadius:12, overflow:'hidden' }}>
                {data.poster && <img src={data.poster} alt={data.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
              </div>
            </div>
            <div style={{ flex:1, maxWidth:1000 }}>
              <h1 style={{ marginBottom:6, textShadow:'0 2px 8px rgba(0,0,0,0.7)' }}>
                {data.title} {data.year ? `(${data.year})` : ''}
              </h1>
              <div style={{ display:'flex', gap:12, alignItems:'center', opacity:0.9 }}>
                {data.rating != null && <span>★ {data.rating}</span>}
                {data.genres?.length ? <span>{data.genres.join(' • ')}</span> : null}
              </div>
              {data.description && <p style={{ marginTop:10, maxWidth:900, lineHeight:1.6, textShadow:'0 2px 8px rgba(0,0,0,0.7)' }}>{data.description}</p>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop:16, paddingBottom:24 }}>
        <video ref={videoRef} controls playsInline style={{ width:'100%', maxWidth:1100, background:'#000', borderRadius:8 }} />
      </div>
    </div>
  );
}
