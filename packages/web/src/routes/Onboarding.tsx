import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

type LinkType = 'M3U' | 'XTREAM';

const defaultXtreamBaseUrl = ''; // pas de valeur par défaut pour éviter toute auto-validation

export default function Onboarding() {
  const nav = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<LinkType>('M3U');

  // M3U
  const [m3uUrl, setM3uUrl] = useState<string>('');

  // Xtream
  const [baseUrl, setBaseUrl] = useState<string>(defaultXtreamBaseUrl);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // UI state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [ok, setOk] = useState<boolean>(false);
  const [err, setErr] = useState<string>('');

  function nextStep() {
    setStep((s) => (s === 3 ? 3 : ((s + 1) as 1 | 2 | 3)));
  }
  function prevStep() {
    setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3)));
  }

  async function linkPlaylist(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setOk(false);
    setSubmitting(true);
    try {
      const body =
        type === 'M3U'
          ? { type: 'M3U', url: m3uUrl }
          : { type: 'XTREAM', baseUrl, username, password };

      const res = await api('/playlists/link', { method: 'POST', body });

      // On n’autorise la redirection que si l’API confirme explicitement la validation
      if (!res || res.validated !== true) {
        const msg =
          (typeof res?.message === 'string' && res.message) ||
          'Validation échouée — vérifiez vos informations.';
        throw new Error(msg);
      }

      setOk(true);
      setTimeout(() => nav('/movies'), 800);
    } catch (e: any) {
      setErr(e?.message || 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '48px auto', padding: '0 16px', fontFamily: 'system-ui, sans-serif', color: '#eee' }}>
      <h1 style={{ marginBottom: 8 }}>Onboarding</h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Configurez votre source IPTV avant d’accéder au contenu.
      </p>

      {/* Steps header */}
      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        {([1, 2, 3] as const).map((s) => (
          <div
            key={s}
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid #333',
              background: step === s ? '#111' : 'transparent',
              color: step === s ? '#fff' : '#999',
              fontSize: 13,
            }}
          >
            Étape {s}
          </div>
        ))}
      </div>

      {step === 1 && (
        <section style={{ display: 'grid', gap: 12 }}>
          <h2>1 — Compte OK ✅</h2>
          <p>
            Votre compte est prêt. Nous allons maintenant lier votre playlist <strong>M3U</strong> ou votre compte <strong>Xtream</strong>.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={nextStep}>Continuer</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section style={{ display: 'grid', gap: 12 }}>
          <h2>2 — Choisissez votre type de source</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                setType('M3U');
                nextStep();
              }}
            >
              M3U
            </button>
            <button
              onClick={() => {
                setType('XTREAM');
                nextStep();
              }}
            >
              Xtream Codes
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={prevStep}>Retour</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2>3 — Lier la source ({type})</h2>

          <form onSubmit={linkPlaylist} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {type === 'M3U' ? (
              <>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span>URL M3U</span>
                  <input
                    placeholder="https://exemple.com/liste.m3u"
                    value={m3uUrl}
                    onChange={(e) => setM3uUrl(e.target.value)}
                    required
                    pattern="https?://.+"
                    style={{ padding: '10px 12px', border: '1px solid #333', borderRadius: 8, background: '#222', color: '#eee' }}
                  />
                </label>
              </>
            ) : (
              <>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span>Base URL Xtream</span>
                  <input
                    placeholder="http://IP:PORT (ex: http://85.31.239.110:8080)"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    required
                    pattern="https?://.+"
                    style={{ padding: '10px 12px', border: '1px solid #333', borderRadius: 8, background: '#222', color: '#eee' }}
                  />
                </label>
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span>Username</span>
                    <input
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      style={{ padding: '10px 12px', border: '1px solid #333', borderRadius: 8, background: '#222', color: '#eee' }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span>Password</span>
                    <input
                      placeholder="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{ padding: '10px 12px', border: '1px solid #333', borderRadius: 8, background: '#222', color: '#eee' }}
                    />
                  </label>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="button" onClick={prevStep} disabled={submitting}>
                Retour
              </button>
              <button type="submit" disabled={submitting}>
                {submitting ? 'Vérification…' : 'Tester & importer'}
              </button>
              {ok && <span style={{ color: 'green' }}>✅ Validé, redirection…</span>}
            </div>

            {err && (
              <div
                role="alert"
                style={{
                  color: '#b00020',
                  background: '#2a0008',
                  border: '1px solid #b00020',
                  padding: '8px 12px',
                  borderRadius: 8,
                }}
              >
                {err}
              </div>
            )}

            <p style={{ opacity: 0.7, fontSize: 13, marginTop: 6 }}>
              L’app ne redirige que si la source est validée par l’API. En cas d’erreur, le message ci-dessus vous guide.
            </p>
          </form>
        </section>
      )}
    </div>
  );
}
