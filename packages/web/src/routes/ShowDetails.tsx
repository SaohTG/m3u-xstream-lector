import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Hls from 'hls.js';
import { api, getApiBase, getToken } from '../lib/api';
import { attachProgressReporter } from '../lib/progress';

type Series = {
  id: string; title: string; description?: string; rating?: number | null;
  poster?: string | null; backdrop?: string | null; released?: string | null; genres?: string[];
};
type Seasons = { seriesId: string; seasons: Array<{ season: number; episodes: Array<{ id: string; number: number; title: string }> }> };

function upgradeBackdropQuality(u?: string | null): string | null {
  if (!u) return null;
  try {
    if (u.includes('image.tmdb.org')) {
      return u.replace(/\/w\d+\//, '/original/').replace(/\/t\/p\/w\d+\//, '/t/p/original/');
    }
    return u;
  } catch { return u || null; }
}

export default function ShowDetails() {
  const { seriesId = '' } = useParams();
  const [info, setInfo] = useState<Series | null>(null);
  const [seasons, setSeasons] = useState<Seasons | null>(null);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!seriesId) return <div style={{ padding:16, color:'#fff' }}>ID de série manquant.</div>;

  useEffect(() => {
    let mounted = true;
    setErr(null);
    (async () => {
      const i = await api(`/vod/shows/${encodeURIComponent(seriesId)}/details`);
      const s = await api(`/vod/shows/${encodeURIComponent(seriesId)}/seasons`);
      if (!mounted) return;
      setInfo(i); setSeasons(s);
      const first = s?.seasons?.[0]?.episodes?.[0];
      if (first) setCurrentEpisodeId(first.id);
    })().catch((e) => setErr(e?.message || String(e)));
    return () => { mounted = false; };
  }, [seriesId]);

  useEffect(() => {
    const base = getApiBase();
    const t = getToken();
    if (!currentEpisodeId) { setHlsUrl(null); return; }
    setHlsUrl(`${base}/vod/episodes/${encodeURIComponent(currentEpisodeId)}/hls${t ? `?t=${encodeURIComponent(t)}` : ''}`);
  }, [currentEpisodeId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl || !currentEpisodeId) return;
    let hls: Hls | null = null;
    let cleanup: (() => void) | null = null;

    const onLoaded = () => {
      if (!cleanup) cleanup = attachProgressReporter(video, { kind: 'EPISODE', refId: currentEpisodeId, seriesId });
      video.play().catch(() => {});
    };

    hls = new Hls({
      enableWorker: true,
      xhrSetup: (xhr) => {
        const t = getToken();
        if (t) xhr.setRequestHeader('Authorization', `Bearer ${t}`);
      },
    });
    hls.attachMedia(video);
    hls.on(Hls.Events.MEDIA_ATTACHED, () => { hls!.loadSource(hlsUrl); });

    if (video.readyState >= 1) onLoaded();
    video.addEventListener('loadedmetadata', onLoaded);
    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      if (cleanup) cleanup();
      if (hls) hls.destroy();
    };
  }, [seriesId, currentEpisodeId, hlsUrl]);

  if (err) return <div style={{ padding:16, color:'#ff6b6b' }}>Erreur: {err}</div>;
  if (!info) return <div style={{ padding:16, color:'#fff' }}>Chargement…</div>;

  const backdropHQ = upgradeBackdropQuality(info.backdrop);

  return (
    <div style={{ color:'#fff' }}>
      <div style={{ position:'relative', borderRadius:12, overflow:'hidden', border:'1px solid #222' }}>
        <div style={{ width:'100%', minHeight:320, background: backdropHQ ? `center/cover url(${backdropHQ})` : '#101010' }} />
        <div style={{ position:'absolute', inset:0, background: `
          linear-gradient(180deg, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.75) 100%),
          linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.15) 100%)` }} />
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'flex-end' }}>
          <div style={{ display:'flex', gap:16, padding:16, width:'100%' }}>
            <div style={{ width:220, flex:'0 0 auto' }}>
              <div style={{ width:'100%', aspectRatio:'2/3', background:'#111', border:'1px solid #222', borderRadius:12, overflow:'hidden' }}>
                {info.poster && <img src={info.poster} alt={info.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
              </div>
            </div>
            <div style={{ flex:1, maxWidth:1000 }}>
              <h1 style={{ marginBottom:6, textShadow:'0 2px 8px rgba(0,0,0,0.7)' }}>{info.title}</h1>
              <div style={{ display:'flex', gap:12, alignItems:'center', opacity:0.9 }}>
                {info.rating != null && <span>★ {info.rating}</span>}
                {info.genres?.length ? <span>{info.genres.join(' • ')}</span> : null}
                {info.released ? <span>{info.released}</span> : null}
              </div>
              {info.description && <p style={{ marginTop:10, maxWidth:900, lineHeight:1.6, textShadow:'0 2px 8px rgba(0,0,0,0.7)' }}>{info.description}</p>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:16, marginTop:20 }}>
        <div style={{ maxHeight:520, overflow:'auto', border:'1px solid #222', borderRadius:8 }}>
          {seasons?.seasons?.map(sea => (
            <div key={sea.season}>
              <div style={{ padding:'6px 10px', background:'#141414', borderBottom:'1px solid #222' }}>Saison {sea.season}</div>
              {sea.episodes.map(ep => (
                <button key={ep.id} onClick={() => setCurrentEpisodeId(ep.id)} style={{
                  display:'block', width:'100%', textAlign:'left', padding:'8px 10px',
                  border:'none', background: currentEpisodeId === ep.id ? '#1f1f1f' : 'transparent',
                  color:'#fff', cursor:'pointer', borderBottom:'1px solid #222'
                }}>
                  E{String(ep.number).padStart(2,'0')} — {ep.title}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div>
          {!hlsUrl ? <div style={{ opacity:0.8 }}>Sélectionnez un épisode…</div>
            : <video ref={videoRef} controls playsInline style={{ width:'100%', maxWidth:1100, background:'#000', borderRadius:8 }} />}
        </div>
      </div>
    </div>
  );
}
