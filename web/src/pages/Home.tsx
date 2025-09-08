import React, { useEffect, useState } from 'react';
import { listMovies } from '../api';

export default function Home() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await listMovies();
        setItems(Array.isArray(res?.items) ? res.items : []);
      } catch (e:any) {
        setErr(e.message || 'Erreur de chargement');
      }
    })();
  }, []);

  return (
    <div style={{padding:16}}>
      <h2>Bienvenue</h2>
      {err && <div style={{color:'tomato'}}>{err}</div>}
      {!err && items.length === 0 && <div>Aucun contenu pour le moment.</div>}
      {items.length > 0 && (
        <ul>
          {items.map((m:any) => <li key={m.id ?? m.url}>{m.title}</li>)}
        </ul>
      )}
      <button onClick={() => { localStorage.removeItem('token'); location.replace('/login'); }}>
        Se déconnecter
      </button>
    </div>
  );
}
