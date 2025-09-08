import React, { useEffect, useState } from 'react';
import { listMovies } from '../api';

export default function Movies() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await listMovies({ page: 1, pageSize: 48 });
        if (mounted) setItems(res.items);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="p-4">Chargement…</div>;
  if (!items.length) return <div className="p-4">Aucun film importé pour le moment.</div>;

  return (
    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {items.map((m) => (
        <div key={m.id} className="bg-neutral-800 rounded-lg overflow-hidden">
          <div className="aspect-[2/3] bg-neutral-700" style={{backgroundImage: m.posterUrl ? `url(${m.posterUrl})` : undefined, backgroundSize:'cover'}} />
          <div className="p-2 text-sm">{m.title}</div>
        </div>
      ))}
    </div>
  );
}
