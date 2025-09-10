import { api } from './api';

type Payload =
  | { kind: 'MOVIE'; refId: string }
  | { kind: 'EPISODE'; refId: string; seriesId: string };

export function attachProgressReporter(video: HTMLVideoElement, payload: Payload) {
  let lastSent = 0;
  let timer: any = null;

  const send = async () => {
    try {
      const position = Math.floor(video.currentTime || 0);
      const duration = Math.floor(video.duration || 0);
      if (!duration || position === lastSent) return;
      lastSent = position;
      await api('/progress/report', {
        method: 'POST',
        body: JSON.stringify({
          kind: (payload as any).kind,
          refId: (payload as any).refId,
          seriesId: (payload as any).seriesId,
          position,
          duration,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // silencieux
    }
  };

  const onTime = () => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      send();
    }, 10000); // ~10s
  };

  const onPause = () => send();
  const onEnded = () => send();

  video.addEventListener('timeupdate', onTime);
  video.addEventListener('pause', onPause);
  video.addEventListener('ended', onEnded);

  return () => {
    if (timer) clearTimeout(timer);
    video.removeEventListener('timeupdate', onTime);
    video.removeEventListener('pause', onPause);
    video.removeEventListener('ended', onEnded);
  };
}
