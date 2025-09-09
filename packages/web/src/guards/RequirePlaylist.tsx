import React from 'react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function RequirePlaylist({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<'loading'|'ok'|'missing'>('loading');
  const nav = useNavigate();

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api('/playlists/me');
        if (!mounted) return;
        if (res && res.type) setState('ok');
        else setState('missing');
      } catch (e: any) {
        const msg = String(e.message || '');
        if (msg.startsWith('401')) nav('/auth', { replace: true });
        else setState('missing');
      }
    })();
    return () => { mounted = false; };
  }, [nav]);

  if (state === 'loading') return <p>Chargement…</p>;
  if (state === 'missing') { nav('/onboarding', { replace: true }); return null; }
  return <>{children}</>;
}
