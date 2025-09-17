'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@lib/api';
import { useParams } from 'next/navigation';
import PlayerHLS from '../../../components/PlayerHLS';
import { useEffect, useState } from 'react';

export default function MovieDetail() {
  const { id } = useParams() as { id: string };
  const { data } = useQuery({ queryKey: ['movie', id], queryFn: async ()=> (await api.get(`/api/vod/movies/${id}`)).data });
  const { data: stream } = useQuery({ queryKey: ['movie-stream', id], queryFn: async ()=> (await api.get(`/api/vod/movies/${id}/stream`)).data });
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(()=> { if (stream?.url) setUrl(stream.url); }, [stream]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{data?.title || 'Film'}</h1>
      <PlayerHLS src={url} />
    </div>
  );
}
