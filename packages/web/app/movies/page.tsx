'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@lib/api';
import Rail from '../../components/Rail';

export default function MoviesPage() {
  const { data } = useQuery({ queryKey: ['movies-rails'], queryFn: async ()=> (await api.get('/api/vod/movies/rails')).data });
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Films</h1>
      {data?.map((r:any)=> <Rail key={r.title} title={r.title} items={r.items} />) || <p>Aucun film à afficher.</p>}
    </div>
  );
}
