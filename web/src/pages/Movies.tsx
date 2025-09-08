import React, { useEffect, useState } from 'react';
import { listMovies } from '../api';
import { asArray } from '../utils/safe';

export default function Movies() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await listMovies({ page: 1, pageSize: 48 });
        if (alive) setItems(asArray(res?.items));
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Erreur de chargement');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="p-4">Chargement…</div>;
  if (err) return <div className="p-4 text-red-400">{err}</div>;
  if (!items.length) return <div className="p-4">Aucun film à afficher.</div>;

  return (
    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {items.map((m) => (
        <div key={m.id ?? m.url} className="bg-neutral-800 rounded-lg overflow-hidden">
          <div className="aspect-[2/3] bg-neutral-700"
               style={{ backgroundImage: m.posterUrl ? `url(${m.posterUrl})` : undefined, backgroundSize: 'cover' }} />
          <div className="p-2 text-sm">{m.title || 'Sans titre'}</div>
        </div>
      ))}
    </div>
  );
}
