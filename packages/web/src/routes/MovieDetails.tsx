import React from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

type MovieDetail = {
  id: string | number;
  title: string | null;
  year: number | null;
  plot: string | null;
  rating: number | null;
  poster: string | null;
  backdrop: string | null;
  stream_url: string;
  tmdb_id?: number;
  source: 'XTREAM' | 'M3U';
};

export default function MovieDetails() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = React.useState<MovieDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');
  const [play, setPlay] = React.useState(false);

  async function load() {
    if (!id) return;
    setLoading(true); setErr('');
    try {
      const res = await api(`/vod/movies/${encodeURIComponent(id)}`);
      setData(res as MovieDetail);
    } catch (e: any) {
      setErr(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, [id]);

  if (loading) return <p>Chargement…</p>;
  if (err) return <div><p style={{color:'#f66'}}>Erreur : {err}</p><button onClick={load}>Réessayer</button></div>;
  if (!data) return <p>Introuvable.</p>;

  return (
    <div style={{ display:'grid', gap:16 }}>
      {/* Hero */}
      <div style={{
        position:'relative',
        borderRadius:16,
        overflow:'hidden',
        border:'1px solid #222',
        background:'#0e0e0e',
        minHeight:200
      }}>
        {data.backdrop ? (
          <img src={data.backdrop} alt="" style={{ width:'100%', height:260, objectFit:'cover', opacity:.35 }} />
        ) : null}
        <div style={{ position:'absolute', inset:0, display:'flex', gap:16, padding:16 }}>
          {data.poster ? (
            <img src={data.poster} alt={data.title ?? ''} style={{ width:160, height:240, objectFit:'cover', borderRadius:12, border:'1px solid #333' }}/>
          ) : (
            <div style={{ width:160, height:240, background:'#1a1a1a', borderRadius:12, border:'1px solid #333' }} />
          )}
          <div style={{ display:'grid', alignContent:'center', gap:8 }}>
            <h1 style={{ margin:0 }}>{data.title || 'Sans titre'}</h1>
            <div style={{ opacity:.8 }}>
              {data.year ? <span>{data.year} · </span> : null}
              {typeof data.rating === 'number' ? <span>TMDB {Number(data.rating).toFixed(1)}/10</span> : null}
              {(!data.year && data.rating==null) ? <span>—</span> : null}
            </div>
            {data.plot ? <p style={{ maxWidth:700, margin:0, opacity:.9 }}>{data.plot}</p> : <p style={{opacity:.7}}>Aucune description.</p>}
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setPlay(true)} style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #333', background:'#fff', color:'#000', fontWeight:600 }}>
                ▶️ Lire
              </button>
              {data.tmdb_id ? (
                <a href={`https://www.themoviedb.org/movie/${data.tmdb_id}`} target="_blank" rel="noreferrer"
                   style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #333', color:'#fff' }}>
                  Voir sur TMDB
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Lecteur */}
      {play ? (
        <div style={{ border:'1px solid #222', borderRadius:12, overflow:'hidden', background:'#000' }}>
          <video
            controls
            playsInline
            crossOrigin="anonymous"
            style={{ width:'100%', maxHeight: '70vh', background:'#000' }}
            src={data.stream_url}
          />
        </div>
      ) : null}

      {/* Debug simple */}
      <div style={{ fontSize:12, opacity:.7 }}>
        Source: {data.source} · URL: <code>{data.stream_url}</code>
      </div>
    </div>
  );
}
