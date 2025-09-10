import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Hls from 'hls.js';
import { api } from '../lib/api';
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

export default function MovieDetails() {
  const { movieId = '' } = useParams();
  const [data, setData] = useState<Movie | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!movieId) return;
    let mounted = true;
    const load = async () => {
      const d = await api(`/vod/movies/${encodeURIComponent(movieId)}/details`);
      if (!mounted) return;
      setData(d);
      const u = await api(`/vod/movies/${encodeURIComponent(movieId)}/url`);
      if (!mounted) return;
      setUrl(u.url);
    };
    load().catch(console.error);
    return () => { mounted = false; };
  }, [movieId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url || !movieId) return;
    let hls: Hls | null = null;
    let cleanup: (() => void) | null = null;

    const attachReporter = () => {
      if (!cleanup) {
        cleanup = attachProgressReporter(video, { kind: 'MOVIE', refId: movieId });
      }
    };

    const onLoaded = () => {
      attachReporter();
      if (autoPlay) video.play().catch(() => {});
    };

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls!.loadSource(url);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    } else {
      video.src = url; // mp4 fallback
    }

    if (video.readyState >= 1) onLoaded();
    video.addEventListener('loadedmetadata', onLoaded);

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      if (cleanup) cleanup();
      if (hls) hls.destroy();
    };
  }, [movieId, url, autoPlay]);

  if (!movieId) return <div style={{ padding: 16, color:'#fff' }}>ID de film manquant.</div>;
  if (!data) return <div style={{ padding: 16, color:'#fff' }}>Chargement…</div>;

  return (
    <div style={{ padding: 16, color: '#fff' }}>
      <div
        style={{
          borderRadius:12, overflow:'hidden',
          background: data.backdrop ? `center/cover url(${data.backdrop})` : '#101010',
          padding:'24px 16px', border:'1px solid #222'
        }}
      >
        <div style={{ display:'flex', gap:16 }}>
          <div style={{ width:220, flex:'0 0 auto' }}>
            <div style={{ width:'100%', aspectRatio:'2/3', background:'#111', border:'1px solid #222', borderRadius:12, overflow:'hidden' }}>
              {data.poster && <img src={data.poster} alt={data.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
            </div>
          </div>
          <div style={{ flex:1 }}>
            <h1 style={{ marginBottom:8 }}>{data.title} {data.year ? `(${data.year})` : ''}</h1>
            {data.rating != null && <div style={{ opacity:0.8 }}>Note: {data.rating}</div>}
            {data.genres && data.genres.length > 0 && (
              <div style={{ opacity:0.8, marginTop:4 }}>{data.genres.join(' • ')}</div>
            )}
            {data.description && <p style={{ marginTop:12, maxWidth:800, lineHeight:1.5 }}>{data.description}</p>}
            {url && (
              <button
                onClick={() => { setAutoPlay(true); const v = videoRef.current; if (v) v.play().catch(()=>{}); }}
                style={{ marginTop:12, background:'#fff', color:'#000', border:'none', borderRadius:8, padding:'8px 14px', cursor:'pointer' }}
              >
                Lire
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop:20 }}>
        <video ref={videoRef} controls playsInline style={{ width:'100%', maxWidth: 1000, background:'#000' }} />
      </div>
    </div>
  );
}
