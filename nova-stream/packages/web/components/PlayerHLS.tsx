'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface PlayerHLSProps {
  src: string;
}

export function PlayerHLS({ src }: PlayerHLSProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.error("Autoplay was prevented:", e));
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari and other browsers that support HLS natively
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.error("Autoplay was prevented:", e));
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      className="w-full h-full object-contain bg-black"
      autoPlay
      muted // Autoplay often requires the video to be muted initially
    />
  );
}
