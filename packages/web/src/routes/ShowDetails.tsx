import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Hls from 'hls.js';
import { api } from '../lib/api';
import { attachProgressReporter } from '../lib/progress';

type Series = {
  id: string;
  title: string;
  description?: string;
  rating?: number | null;
  poster?: string | null;
  backdrop?: string | null;
  released?: string | null;
  genres?: string[];
};

type Seasons = {
  seriesId: string;
  seasons: Array<{ season: number; episodes: Array<{ id: string; number: number; title: string }> }>;
};

export default function ShowDetails() {
  const { seriesId = '' } = useParams();
  const [info, setInfo] = useState<Series | null>(null);
  const [seasons, setSeasons] = useState<Seasons | null>(null);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Guard: si pas d'id dans l'URL
  if (!seriesId) {
    return <div style={{ padding: 16, color:'#fff' }}>ID de série manquant.</div>;
  }

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const i = await api(`/vod/shows/${encodeURIComponent(seriesId)}/details`);
      const s = await api(`/vod/shows/${encodeURIComponent(seriesId)}/seasons`);
      if (!mounted) return;
      setInfo(i);
      setSeasons(s);
      const first = s?.seasons?.[0]?.episodes?.[0];
      if (first) setCurrentEpisodeId(first.id);
    };
    load().catch(console.error);
    return () => { mounted = false; };
  }, [seriesId]);

  useEffect(() => {
    let mounted = true;
    if (!currentEpisodeId) return;
    api(`/episodes/${encodeURIComponent(currentEpisodeId)}/url`)
      .then((r) => { if (mounted) setPlayUrl(r.url); })
      .catch(console.error);
    return () => { mounted = false; };
  }, [currentEpisodeId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playUrl || !currentEpisodeId) return;
    let hls: Hls | null = null;
    let cleanup: (() => void) | null = null;

    const attachReporter = () => {
      if (!cleanup) {
        cleanup = attachProgressReporter(video, {
          kind: 'EPISODE',
          refId: currentEpisodeId,
          seriesId,
        });
      }
    };

    const onLoaded = () => {
      attachReporter();
      video.play().catch(() => {});
    };

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls!.loadSource(playUrl);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playUrl;
    } else {
      video.src = playUrl;
    }

    if (video.readyState >= 1) onLoaded();
    video.addEventListener('loadedmetadata', onLoaded);

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      if (cleanup) cleanup();
      if (hls) hls.destroy();
    };
  }, [seriesId, currentEpisodeId, playUrl]);

  if (!info) return <div style={{ padding: 16, color:'#fff' }}>Chargement…</div>;

  return (
    <div style={{ padding: 16, color: '#fff' }}>
      <h1 style={{ marginBottom: 8 }}>{info.title}</h1>
      {info.rating != null && <div style={{ opacity:0.8 }}>Note: {info.rating}</div>}
      {info.genres && info.genres.length > 0 && (
        <div style={{ opacity:0.8, marginTop:4 }}>{info.genres.join(' • ')}</div>
      )}
      {info.description && <p style={{ marginTop:12, maxWidth:800, lineHeight:1.5 }}>{info.description}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginTop: 20 }}>
        <div style={{ maxHeight: 520, overflow: 'auto', border: '1px solid #222', borderRadius: 8 }}>
          {seasons?.seasons?.map(sea => (
            <div key={sea.season}>
              <div style={{ padding: '6px 10px', background: '#141414', borderBottom: '1px solid #222' }}>
                Saison {sea.season}
              </div>
              {sea.episodes.map(ep => (
                <button
                  key={ep.id}
                  onClick={() => setCurrentEpisodeId(ep.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    border: 'none',
                    background: currentEpisodeId === ep.id ? '#1f1f1f' : 'transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    borderBottom: '1px solid #222'
                  }}
                >
                  E{String(ep.number).padStart(2, '0')} — {ep.title}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div>
          <video ref={videoRef} controls playsInline style={{ width: '100%', maxWidth: 1000, background: '#000' }} />
        </div>
      </div>
    </div>
  );
}
