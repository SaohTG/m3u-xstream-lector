'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@lib/api';
import Rail from '../../components/Rail';

export default function SeriesPage() {
  const { data } = useQuery({ queryKey: ['series-rails'], queryFn: async ()=> (await api.get('/api/vod/series/rails')).data });
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Séries</h1>
      {data?.map((r:any)=> <Rail key={r.title} title={r.title} items={r.items} />) || <p>Aucune série à afficher.</p>}
    </div>
  );
}
