import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';

type Mode = 'm3u' | 'xtream';

export default function Onboarding() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('m3u');
  const [name, setName] = useState<string>('');

  // M3U
  const [m3uUrl, setM3uUrl] = useState<string>('');

  // Xtream
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [xtUser, setXtUser] = useState<string>('');
  const [xtPass, setXtPass] = useState<string>('');

  // UI
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Info existante
  const [current, setCurrent] = useState<any | null>(null);

  useEffect(() => {
    // Récupère la/les playlists liées (pour info)
    (async () => {
      try {
        setChecking(true);
        const res = await api('/playlists/me');
        const items = Array.isArray(res?.items) ? res.items : [];
        const active = items.find((p: any) => p.active) || null;
        setCurrent(active);
      } catch (e) {
        // pas bloquant
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  function normalizeBaseUrl(u: string) {
    const t = u.trim();
    if (!t) return '';
    // ajoute http si manquant
    if (!/^https?:\/\//i.test(t)) return `http://${t}`.replace(/\/+$/, '');
    return t.replace(/\/+$/, '');
  }

  function looksLikeUrl(u: string) {
    return /^https?:\/\/.+/i.test(u.trim());
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'm3u') {
        const url = m3uUrl.trim();
        if (!looksLikeUrl(url)) {
          throw new Error('URL M3U invalide (doit commencer par http:// ou https://)');
        }
        await api('/playlists/link', {
          body: {
            type: 'm3u',
            m3u_url: url,
            name: name.trim() || undefined,
          },
        });
      } else {
        const base = normalizeBaseUrl(baseUrl);
        if (!looksLikeUrl(base)) {
          throw new Error('Base URL Xtream invalide (ex: http://ip:port)');
        }
        if (!xtUser.trim() || !xtPass) {
          throw new Error('Identifiants Xtream requis (username + password)');
        }
        await api('/playlists/link', {
          body: {
            type: 'xtream',
            base_url: base,
            username: xtUser.trim(),
            password: xtPass,
            name: name.trim() || undefined,
          },
        });
      }

      // Succès → go contenu
      navigate('/movies', { replace: true });
    } catch (err: any) {
      if (err instanceof ApiError) {
        const msg = Array.isArray(err.raw?.message)
          ? err.raw.message.join(', ')
          : err.raw?.message || `${err.status} ${err.raw?.error || 'Erreur API'}`;
        setError(msg);
        console.error('Onboarding API error:', err.status, err.raw);
      } else {
        setError(err?.message || 'Erreur inconnue');
        console.error('Onboarding error:', err);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0b0b0b', color: '#eee', display: 'grid', placeItems: 'center', padding: 16 }}>
      <form
        onSubmit={submit}
        style={{
          width: 560,
          maxWidth: '95vw',
          background: '#121212',
          border: '1px solid #222',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
          NovaStream — Lier une playlist
        </div>

        <p style={{ opacity: 0.75, fontSize: 13, marginTop: 0 }}>
          Choisissez votre source IPTV : <b>M3U</b> ou <b>Xtream Codes</b>. Nous validerons la connexion avant d’importer.
        </p>

        <div style={{ display: 'flex', gap: 12, margin: '12px 0 16px' }}>
          <button type="button" onClick={() => setMode('m3u')} style={tabStyle(mode === 'm3u')}>
            M3U
          </button>
          <button type="button" onClick={() => setMode('xtream')} style={tabStyle(mode === 'xtream')}>
            Xtream
          </button>
          <div style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.7, alignSelf: 'center' }}>
            {checking ? 'Vérification…' : current ? `Active: ${current.name || current.type}` : 'Aucune playlist active'}
          </div>
        </div>

        <label style={labelStyle}>Nom (optionnel)</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={mode === 'm3u' ? 'Ma M3U' : 'Mon Xtream'}
          type="text"
          style={inputStyle}
        />

        {mode === 'm3u' ? (
          <>
            <label style={labelStyle}>URL de la playlist M3U</label>
            <input
              value={m3uUrl}
              onChange={(e) => setM3uUrl(e.target.value)}
              placeholder="https://exemple.com/playlist.m3u"
              inputMode="url"
              required
              style={inputStyle}
            />
            <ul style={hintListStyle}>
              <li>L’URL doit commencer par <code>http://</code> ou <code>https://</code>.</li>
              <li>Nous vérifions la présence de <code>#EXTM3U</code> côté serveur.</li>
            </ul>
          </>
        ) : (
          <>
            <label style={labelStyle}>Base URL Xtream</label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://IP:PORT"
              inputMode="url"
              required
              style={inputStyle}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
              <div>
                <label style={labelStyle}>Username</label>
                <input
                  value={xtUser}
                  onChange={(e) => setXtUser(e.target.value)}
                  placeholder="ab12345"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input
                  value={xtPass}
                  onChange={(e) => setXtPass(e.target.value)}
                  placeholder="********"
                  type="password"
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <ul style={hintListStyle}>
              <li>Utilise la base (ex: <code>http://1.2.3.4:8080</code>), sans <code>/player_api.php</code>.</li>
              <li>Nous validons les identifiants via <code>player_api.php</code>.</li>
            </ul>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            marginTop: 16,
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px solid #333',
            background: '#fff',
            color: '#000',
            fontWeight: 800,
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Validation…' : 'Lier et importer'}
        </button>

        {error && (
          <div style={{ color: '#ff6b6b', marginTop: 12, fontSize: 14 }}>
            {error}
          </div>
        )}

        <p style={{ opacity: 0.6, fontSize: 12, marginTop: 16, lineHeight: 1.4 }}>
          Astuce : si vous changez de source plus tard, l’ancienne playlist sera désactivée mais conservée.
        </p>
      </form>
    </div>
  );
}

/* styles utilitaires */
function tabStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #333',
    background: active ? '#2b2b2b' : '#181818',
    color: active ? '#fff' : '#bbb',
    fontWeight: 700,
    cursor: 'pointer',
  };
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginTop: 10,
  marginBottom: 6,
  fontSize: 13,
  opacity: 0.9,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #333',
  background: '#0e0e0e',
  color: '#fff',
  outline: 'none',
};

const hintListStyle: React.CSSProperties = {
  marginTop: 8,
  marginBottom: 0,
  opacity: 0.7,
  fontSize: 12,
  lineHeight: 1.5,
};
