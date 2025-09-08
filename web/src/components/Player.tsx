import Hls from 'hls.js'
import { useEffect, useRef } from 'react'
import { setProgress } from '../api'

export default function Player({src, mediaId}:{src:string, mediaId:string}){
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(()=>{
    const video = videoRef.current!
    let hls: Hls | null = null
    if(Hls.isSupported()){
      hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
    }else{
      video.src = src
    }
    const handler = () => {
      const position = Math.floor(video.currentTime)
      const duration = Math.floor(video.duration || 0)
      if(mediaId) setProgress(mediaId, position, duration).catch(()=>{})
    }
    const int = setInterval(handler, 5000)
    return ()=>{ clearInterval(int); if(hls){ hls.destroy() } }
  },[src, mediaId])

  return <video ref={videoRef} controls className="w-full rounded-2xl bg-black aspect-video" />
}
