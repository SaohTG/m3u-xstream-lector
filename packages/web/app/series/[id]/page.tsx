'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@lib/api';

export default function SeriesDetail() {
  const { id } = useParams() as { id: string };
  const { data } = useQuery({ queryKey: ['series', id], queryFn: async ()=> (await api.get(`/api/vod/series/${id}`)).data });
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{data?.title || 'Série'}</h1>
      <p className="opacity-70">Sélectionnez une saison et un épisode (version démo minimaliste).</p>
    </div>
  );
}
