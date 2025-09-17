'use client';
import Hls from 'hls.js';
import { useEffect, useRef } from 'react';

export default function PlayerHLS({ src }: { src?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(()=> {
    if (!src || !ref.current) return;
    if (ref.current.canPlayType('application/vnd.apple.mpegurl')) {
      ref.current.src = src;
      return;
    }
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(ref.current);
      return () => hls.destroy();
    }
  }, [src]);
  return <video ref={ref} controls className="w-full rounded-lg bg-black aspect-video" />;
}
