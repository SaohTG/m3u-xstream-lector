import React, { useEffect, useRef, useState } from 'react';
import ProgressBar from '../components/ProgressBar';
import { parseM3U } from '../api';

// ... tes autres imports et types

export default function Home() {
  const [url, setUrl] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [current, setCurrent] = useState<Item | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // ⬇️ états de progression
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState<string>('Préparation…');
  const abortRef = useRef<AbortController | null>(null);
  const tickRef = useRef<number | null>(null);

  // arrête la progression douce
  const stopTick = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const startSoftProgress = () => {
    // Monte doucement jusqu’à 90% pendant l’attente API
    stopTick();
    setProgress(10);
    tickRef.current = window.setInterval(() => {
      setProgress((p) => (p < 90 ? p + 1 : p));
    }, 350);
  };

  const cancelImport = () => {
    abortRef.current?.abort();
    stopTick();
    setLoading(false);
    setProgress(0);
    setProgressText('Annulé.');
  };

  const handleImport = async () => {
    setErr(null);

    const u = (url || '').trim();
    if (!/^https?:\/\//i.test(u)) {
      setErr("Merci d'entrer une URL M3U valide (http/https).");
      return;
    }

    try {
      setLoading(true);
      setProgress(5);
      setProgressText('Validation de l’URL…');

      // contrôleur d’annulation
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      // progression douce pendant l’attente
      setProgressText('Récupération de la playlist…');
      startSoftProgress();

      const result = await parseM3U(u, ctrl.signal);

      // fin OK
      stopTick();
      setProgress(100);
      setProgressText('Terminé ✓');
      setItems(result);
    } catch (e: any) {
      stopTick();
      if (e?.name === 'CanceledError' || e?.message === 'canceled') {
        setErr('Import annulé.');
      } else {
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          'Échec de l’import M3U';
        setErr(msg);
      }
    } finally {
      // Laisse 500ms la barre à 100% pour feedback visuel
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
        setProgressText(''); // reset
      }, 500);
    }
  };

  useEffect(() => {
    return () => stopTick(); // cleanup interval
  }, []);

  return (
    <div className="p-4 space-y-6">
      {/* Carte d’import */}
      <div className="card p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <input
            className="flex-1 p-3 rounded bg-neutral-800"
            placeholder="Collez l'URL M3U et validez"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
          <div className="flex gap-2">
            <button
              className="btn"
              onClick={handleImport}
              disabled={loading}
            >
              {loading ? 'Import…' : 'Importer'}
            </button>
            {loading && (
              <button className="btn bg-red-600 hover:bg-red-700" onClick={cancelImport}>
                Annuler
              </button>
            )}
          </div>
        </div>

        {/* Erreur éventuelle */}
        {err && <div className="text-red-400 text-sm">{err}</div>}

        {/* Barre de progression */}
        {loading && (
          <div className="mt-2">
            <ProgressBar value={progress} label={progressText} />
          </div>
        )}
      </div>

      {/* … le reste de ta page : grilles, lecteur, etc. */}
    </div>
  );
}
