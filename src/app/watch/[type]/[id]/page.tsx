"use client";
import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { useParams } from "next/navigation";

export default function WatchPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const params = useParams<{type:string,id:string}>();

  useEffect(() => {
    async function run() {
      // Obtain Xtream stream URL via proxy
      const res = await fetch(`/api/xtream/stream?type=${params.type}&id=${params.id}`);
      const { url } = await res.json();
      const video = videoRef.current!;
      if (Hls.isSupported() && url.endsWith(".m3u8")) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
      } else {
        video.src = url;
      }
    }
    run();
  }, [params]);

  return (
    <div className="container py-6">
      <video ref={videoRef} className="w-full rounded-2xl bg-black" controls playsInline />
    </div>
  );
}
