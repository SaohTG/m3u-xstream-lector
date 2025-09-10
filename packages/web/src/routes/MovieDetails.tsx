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
  const { id = '' } = useParams();
  const [data, setData] = useState<Movie | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const d = await api(`/vod/movies/${encodeURIComponent(id)}/details`);
      if (!mounted) return;
      setData(d);
      const u = await api(`/vod/movies/${encodeURIComponent(id)}/url`);
      if (!mounted) return;
      setUrl(u.url);
    };
    load().catch(console.error);
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;
    let hls: Hls | null = null;
    let cleanup: (() => void) | null = null;

    const attachReporter = () => {
      if (!cleanup) {
        cleanup = attachProgressReporter(video, { kind: 'MOVIE', refId: id });
      }
    };

    const onLoaded = () => attachReporter();

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls!.loadSource(url);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    } else {
      // mp4 fallback éventuel
      video.src = url;
    }

    if (video.readyState >= 1) attachReporter();
    video.addEventListener('loadedmetadata', onLoaded);

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      if (cleanup) cleanup();
      if (hls) hls.destroy();
    };
  }, [id, url]);

  if (!data) return <div style={{ padding: 16 }}>Chargement…</div>;

  return (
    <div style={{ padding: 16, color: '#fff' }}>
      <h1 style={{ marginBottom: 8 }}>{data.title} {data.year ? `(${data.year})` : ''}</h1>
      {data.rating != null && <div style={{ opacity: 0.8 }}>Note: {data.rating}</div>}
      {data.genres && data.genres.length > 0 && (
        <div style={{ opacity: 0.8, marginTop: 4 }}>{data.genres.join(' • ')}</div>
      )}
      {data.description && <p style={{ marginTop: 12, maxWidth: 800, lineHeight: 1.5 }}>{data.description}</p>}

      <div style={{ marginTop: 20 }}>
        <video ref={videoRef} controls playsInline style={{ width: '100%', maxWidth: 1000, background: '#000' }} />
      </div>
    </div>
  );
}
