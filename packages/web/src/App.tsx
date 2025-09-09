import React from 'react';
import { api, getToken } from './lib/api';

function DebugBar() {
  const [sum, setSum] = React.useState<{movies:number;shows:number;channels:number;playlistType:string|null}|null>(null);
  const [err, setErr] = React.useState<string>('');
  const token = !!getToken();
  const apiBase = (import.meta as any).env?.VITE_API_BASE || '';

  React.useEffect(() => {
    let stop = false;
    if (!token) return;
    (async () => {
      try {
        const s = await api('/content/summary');
        if (!stop) setSum(s);
      } catch (e:any) {
        if (!stop) setErr(e.message || 'err');
      }
    })();
    return () => { stop = true; };
  }, [token]);

  return (
    <div style={{
      position:'fixed', left:8, bottom:8, fontSize:12, opacity:0.9,
      background:'#111', border:'1px solid #333', borderRadius:8, padding:'6px 8px'
    }}>
      <div>API: {apiBase || '(par défaut)'} · Token: {token ? '✅' : '❌'}</div>
      {sum && (
        <div style={{ marginTop:4 }}>
          Source: <b>{sum.playlistType || '—'}</b> · Films: <b>{sum.movies}</b> · Séries: <b>{sum.shows}</b> · TV: <b>{sum.channels}</b>
        </div>
      )}
      {err && <div style={{color:'#f66'}}>Summary: {err}</div>}
    </div>
  );
}
export default DebugBar;
