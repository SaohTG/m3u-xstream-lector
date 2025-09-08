import { useEffect, useState } from 'react'
import PosterGrid from '../components/PosterGrid'
import { parseM3U } from '../api'
import Player from '../components/Player'

type Item = { externalId:string, title:string, posterUrl?:string, streamUrl?:string, group?:string, type:string }

export default function Home(){
  const [url,setUrl]=useState('')
  const [items,setItems]=useState<Item[]>([])
  const [current,setCurrent]=useState<Item|null>(null)

  const load = async ()=>{
    if(!url) return
    const res = await parseM3U(url)
    setItems(res)
  }

  useEffect(()=>{
    const saved = localStorage.getItem('last_m3u')
    if(saved) setUrl(saved)
  },[])

  return (
    <div className="space-y-6">
      <div className="card p-4 flex gap-2 items-center">
        <input className="flex-1 p-3 rounded bg-neutral-800" placeholder="Collez l'URL M3U et validez" value={url} onChange={e=>setUrl(e.target.value)}/>
        <button className="btn" onClick={()=>{ localStorage.setItem('last_m3u',url); load() }}>Importer</button>
      </div>
      {current && current.streamUrl && (
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-2">{current.title}</h2>
          <Player src={current.streamUrl} mediaId={current.externalId}/>
        </div>
      )}
      <PosterGrid items={items} onClick={(it)=>setCurrent(it as any)}/>
    </div>
  )
}
