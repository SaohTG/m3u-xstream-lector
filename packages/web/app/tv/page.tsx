'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@lib/api';
import PlayerHLS from '../../components/PlayerHLS';
import { usePlayer } from '@lib/stores';
import { useEffect } from 'react';

export default function TVPage() {
  const { data } = useQuery({ queryKey: ['channels'], queryFn: async ()=> (await api.get('/api/live/channels')).data });
  const { url, setUrl } = usePlayer();
  useEffect(()=> { if (!url && data?.[0]?.url) setUrl(data[0].url); }, [data, url, setUrl]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">TV en direct</h1>
      <PlayerHLS src={url} />
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {data?.map((c:any)=> (
          <button key={c.id} onClick={()=>setUrl(c.url)} className="text-left rounded border border-white/10 p-3 hover:bg-white/5">
            <div className="flex items-center gap-3">
              {c.logo ? <img src={c.logo} alt="" className="w-10 h-10 object-contain" /> : <div className="w-10 h-10 bg-white/10 rounded" />}
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-xs opacity-70">{c.group || '—'}</div>
              </div>
            </div>
          </button>
        )) || <div>Aucune chaîne à afficher.</div>}
      </div>
    </div>
  );
}
