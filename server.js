// server.js — backend Express pour IPTV Web Player (sans TMDB + fallback M3U)
// Dépendances:  npm i express compression morgan
// Node 18+ recommandé (fetch natif). Si Node <18 : npm i node-fetch@3

const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const { URL } = require('url');
const { Readable } = require('stream');

const app = express();
const PORT = process.env.PORT || 3000;

/* -------------------- Middlewares -------------------- */
app.disable('x-powered-by');
app.use(compression());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

/* -------------------- Helpers généraux -------------------- */

// fetch wrapper avec support des proxys (HTTP_PROXY / HTTPS_PROXY)
let _fetchImpl = global.fetch;
let _fetchDefaults = {};
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  try {
    const { fetch: undiciFetch, ProxyAgent } = require('undici');
    _fetchImpl = undiciFetch;
    _fetchDefaults.dispatcher = new ProxyAgent(proxyUrl);
  } catch (e) {
    console.warn('Proxy agent non disponible', e.message);
  }
}
async function fetchWrap(url, opts = {}) {
  if (_fetchImpl) return _fetchImpl(url, { ..._fetchDefaults, ...opts });
  try {
    const { default: f } = await import('node-fetch');
    return f(url, opts);
  } catch {
    throw new Error('fetch_not_available: Upgrade Node to v18+ or install node-fetch');
  }
}
async function tryFetch(url, opts = {}) {
  return fetchWrap(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (IPTV-Web-Player)' },
    ...opts
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function ensureServerUrl(base) {
  if (!base) return null;
  let s = String(base).trim();
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
  return s.replace(/\/+$/, '');
}
function joinUrl(base, rel) { try { return new URL(rel, base).toString(); } catch { return rel; } }

// En-têtes Referer/Origin à partir d’une URL
function refHeaders(u) {
  try {
    const o = new URL(u).origin;
    return { Referer: o, Origin: o };
  } catch { return {}; }
}

// Normalise des URLs d’images (protocol-relative, chemins TMDB, etc.)
function normUrl(u) {
  if (!u) return null;
  let s = String(u).trim();
  if (s.startsWith('//')) s = 'https:' + s;
  // Chemins TMDB explicites
  if (/^\/t\/p\//i.test(s)) s = 'https://image.tmdb.org' + s;
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
  return s;
}

/* -------------------- /api/image -------------------- */
app.get('/api/image', async (req, res) => {
  try {
    const raw = req.query.url;
    if (!raw) return res.status(400).send('missing url');
    const url = normUrl(raw);

    const r = await tryFetch(url, { headers: refHeaders(url) });
    if (!r.ok) throw new Error('upstream ' + r.status);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    const len = r.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    res.status(r.status);
    if (r.body) {
      if (typeof r.body.pipe === 'function') r.body.pipe(res);
      else Readable.fromWeb(r.body).pipe(res);
    } else {
      res.end();
    }
  } catch (e) {
    console.error('image', e.message);
    res.status(404).send('img not found');
  }
});

/* -------------------- /api/m3u (proxy + fallback Xtream) -------------------- */
app.get('/api/m3u', async (req, res) => {
  try {
    const src = req.query.url;
    if (!src) return res.status(400).send('missing url');

    // 1) Tentative directe avec en-têtes “navigateur”
    let origin = '';
    try { origin = new URL(src).origin; } catch {}
    try {
      const r = await tryFetch(src, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          ...(origin ? { 'Referer': origin, 'Origin': origin } : {})
        },
        redirect: 'follow'
      });

      if (r.ok) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', r.headers.get('content-type') || 'audio/x-mpegurl');
        const len = r.headers.get('content-length');
        if (len) res.setHeader('Content-Length', len);
        res.status(r.status);
        if (r.body) {
          if (typeof r.body.pipe === 'function') return r.body.pipe(res);
          return Readable.fromWeb(r.body).pipe(res);
        }
        return res.end();
      }
      console.warn('get.php non accessible (status=', r.status, ') → fallback Xtream → M3U');
    } catch (e) {
      console.warn('fetch get.php error, fallback Xtream → M3U:', e.message);
    }

    // 2) Fallback : si c’est une URL Xtream get.php
    const m3uFromXtream = await generateM3UFromXtreamURL(src);
    if (m3uFromXtream) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
      res.status(200).send(m3uFromXtream);
      return;
    }

    return res.status(502).send('playlist fetch failed');
  } catch (e) {
    console.error('m3u', e.message);
    res.status(502).send('playlist fetch failed');
  }
});

// Génère une M3U via l’API Xtream si on lui donne un lien get.php
function escapeExt(s) { return String(s || '').replace(/"/g, '\\"'); }
async function generateM3UFromXtreamURL(rawUrl) {
  let U;
  try { U = new URL(rawUrl); } catch { return null; }
  if (!/\/get\.php$/i.test(U.pathname)) return null;

  const server = U.origin;
  const user = U.searchParams.get('username');
  const pass = U.searchParams.get('password');
  const output = (U.searchParams.get('output') || '').toLowerCase(); // m3u8|ts|...
  if (!server || !user || !pass) return null;

  const liveExt = /m3u8|hls/.test(output) ? 'm3u8' : 'ts';
  const lines = ['#EXTM3U'];

  try {
    // LIVE
    const liveCats = await xtreamFetch(server, user, pass, 'action=get_live_categories');
    for (const cat of liveCats || []) {
      const list = await xtreamFetch(server, user, pass, `action=get_live_streams&category_id=${encodeURIComponent(cat.category_id)}`);
      for (const ch of list || []) {
        const name = ch.name || ch.stream_display_name || `Ch ${ch.stream_id}`;
        const logo = joinUrl(server, ch.stream_icon || '');
        const group = cat.category_name || 'Live';
        const tvgId = ch.epg_channel_id || '';
        const url = `${server}/live/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${ch.stream_id}.${liveExt}`;
        lines.push(`#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${escapeExt(name)}" tvg-logo="${escapeExt(logo)}" group-title="${escapeExt(group)}",${name}`);
        lines.push(url);
      }
      await sleep(15);
    }

    // FILMS (VOD)
    const vodCats = await xtreamFetch(server, user, pass, 'action=get_vod_categories');
    for (const cat of vodCats || []) {
      const list = await xtreamFetch(server, user, pass, `action=get_vod_streams&category_id=${encodeURIComponent(cat.category_id)}`);
      for (const v of list || []) {
        const name = v.name || v.title || `Film ${v.stream_id}`;
        const logo = joinUrl(server, v.stream_icon || v.cover || '');
        const ext = (v.container_extension || 'mp4').replace(/[^a-z0-9]/ig, '') || 'mp4';
        const group = `Films - ${cat.category_name || 'Divers'}`;
        const url = `${server}/movie/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${v.stream_id}.${ext}`;
        lines.push(`#EXTINF:-1 tvg-logo="${escapeExt(logo)}" group-title="${escapeExt(group)}",${name}`);
        lines.push(url);
      }
      await sleep(15);
    }

    // (On n’inclut pas toutes les séries pour garder la playlist légère.)
    return lines.join('\n');
  } catch (e) {
    console.error('generateM3UFromXtreamURL', e.message);
    return null;
  }
}

/* -------------------- HLS proxy (+ réécriture manifest) -------------------- */
function rewriteM3U8(manifestText, baseUrl) {
  const base = new URL(baseUrl);
  const baseDir = new URL('./', base).toString();
  const lines = manifestText.replace(/\r/g, '').split('\n');
  const out = [];

  for (let line of lines) {
    let l = line.trim();
    if (!l) { out.push(l); continue; }

    if (l.startsWith('#EXT-X-KEY')) {
      l = l.replace(/URI="([^"]+)"/, (m, p1) => {
        const abs = joinUrl(baseDir, p1);
        const prox = `/hls/seg?base=${encodeURIComponent(baseDir)}&u=${encodeURIComponent(abs)}`;
        return `URI="${prox}"`;
      });
      out.push(l);
      continue;
    }

    if (l.startsWith('#')) { out.push(l); continue; }

    const abs = /^https?:\/\//i.test(l) ? l : joinUrl(baseDir, l);
    const prox = `/hls/seg?base=${encodeURIComponent(baseDir)}&u=${encodeURIComponent(abs)}`;
    out.push(prox);
  }
  return out.join('\n');
}

app.get('/hls', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).send('missing url');

    const r = await tryFetch(url, { headers: refHeaders(url) });
    if (!r.ok) throw new Error('upstream ' + r.status);

    const text = await r.text();
    const rewritten = rewriteM3U8(text, url);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(rewritten);
  } catch (e) {
    console.error('hls manifest', e.message);
    res.status(502).send('hls manifest failed');
  }
});

app.get('/hls/seg', async (req, res) => {
  try {
    const base = req.query.base;
    let u = req.query.u;
    if (!u) return res.status(400).send('missing u');
    if (!/^https?:\/\//i.test(u)) u = joinUrl(base, u);

    const r = await tryFetch(u, { headers: refHeaders(u) });
    if (!r.ok) throw new Error('upstream ' + r.status);

    const ct = r.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', ct);
    const len = r.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);

    res.status(r.status);
    if (r.body) {
      if (typeof r.body.pipe === 'function') r.body.pipe(res);
      else Readable.fromWeb(r.body).pipe(res);
    } else {
      res.end();
    }
  } catch (e) {
    console.error('hls seg', e.message);
    res.status(502).send('hls seg failed');
  }
});

/* -------------------- /stream (proxy fichiers avec Range) -------------------- */
app.get('/stream', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).send('missing url');

    const headers = { 'User-Agent': 'Mozilla/5.0 (IPTV-Web-Player)', ...refHeaders(url) };
    if (req.headers.range) headers.Range = req.headers.range;

    const r = await tryFetch(url, { headers });
    if (![200, 206].includes(r.status)) throw new Error('upstream ' + r.status);

    res.setHeader('Access-Control-Allow-Origin', '*');
    const pass = ['content-type','content-length','accept-ranges','content-range','etag','last-modified','cache-control'];
    for (const h of pass) {
      const v = r.headers.get(h);
      if (v) res.setHeader(h.replace(/(^|-)([a-z])/g, s => s.toUpperCase()), v);
    }

    res.status(r.status);
    if (r.body) {
      if (typeof r.body.pipe === 'function') r.body.pipe(res);
      else Readable.fromWeb(r.body).pipe(res);
    } else {
      res.end();
    }
  } catch (e) {
    console.error('stream', e.message);
    res.status(502).send('stream failed');
  }
});

/* -------------------- Xtream Codes helpers -------------------- */
async function xtreamFetch(base, user, pass, qs = '') {
  const url = `${base}/player_api.php?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}${qs ? '&' + qs : ''}`;
  const r = await tryFetch(url, { headers: refHeaders(url) });
  if (!r.ok) throw new Error('xtream ' + r.status);
  return r.json();
}
function mapVodToItem(catName, s, base) {
  return {
    type: 'film',
    name: s.name || s.title || `Film ${s.stream_id}`,
    image: s.stream_icon ? joinUrl(base, s.stream_icon) : s.cover ? joinUrl(base, s.cover) : null,
    stream_id: s.stream_id,
    group: catName || 'Films'
  };
}
function mapSeriesToItem(catName, s, base) {
  return {
    type: 'serie',
    name: s.name || s.title || `Série ${s.series_id}`,
    image: s.cover ? joinUrl(base, s.cover) : s.backdrop_path ? joinUrl(base, s.backdrop_path) : null,
    series_id: s.series_id,
    group: catName || 'Séries'
  };
}
function mapLiveToItem(catName, s, liveUrl, base) {
  return {
    type: 'tv',
    name: s.name || s.stream_display_name || `Ch ${s.stream_id}`,
    image: s.stream_icon ? joinUrl(base, s.stream_icon) : null,
    url: liveUrl,
    group: catName || 'Live'
  };
}

/* -------------------- /api/xtream (films + séries) -------------------- */
app.get('/api/xtream', async (req, res) => {
  let server = ensureServerUrl(req.query.server);
  const user = req.query.user;
  const pass = req.query.pass;
  if (!server || !user || !pass) return res.status(400).send('missing params');

  try {
    // ping login
    await xtreamFetch(server, user, pass);

    // Films
    const vodCats = await xtreamFetch(server, user, pass, 'action=get_vod_categories');
    const allFilms = [];
    for (const cat of vodCats || []) {
      const streams = await xtreamFetch(server, user, pass, `action=get_vod_streams&category_id=${encodeURIComponent(cat.category_id)}`);
      for (const s of streams || []) allFilms.push(mapVodToItem(cat.category_name, s, server));
      await sleep(30);
    }

    // Séries
    const serCats = await xtreamFetch(server, user, pass, 'action=get_series_categories');
    const allSeries = [];
    for (const cat of serCats || []) {
      const streams = await xtreamFetch(server, user, pass, `action=get_series&category_id=${encodeURIComponent(cat.category_id)}`);
      for (const s of streams || []) allSeries.push(mapSeriesToItem(cat.category_name, s, server));
      await sleep(30);
    }

    res.json([...allFilms, ...allSeries]);
  } catch (e) {
    console.error('xtream', e.message);
    res.status(502).send('Échec de la connexion à l’API.');
  }
});

/* -------------------- /api/xtream_live (chaînes TV) -------------------- */
app.get('/api/xtream_live', async (req, res) => {
  let server = ensureServerUrl(req.query.server);
  const user = req.query.user;
  const pass = req.query.pass;
  if (!server || !user || !pass) return res.status(400).send('missing params');

  try {
    const liveCats = await xtreamFetch(server, user, pass, 'action=get_live_categories');
    const out = [];
    for (const cat of liveCats || []) {
      const streams = await xtreamFetch(server, user, pass, `action=get_live_streams&category_id=${encodeURIComponent(cat.category_id)}`);
      for (const s of streams || []) {
        const liveUrl = `${server}/live/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${s.stream_id}.m3u8`;
        out.push(mapLiveToItem(cat.category_name, s, liveUrl, server));
      }
      await sleep(20);
    }
    res.json(out);
  } catch (e) {
    console.error('xtream_live', e.message);
    res.status(502).send('live fetch failed');
  }
});

/* -------------------- /api/xtream_resolve_vod -------------------- */
app.get('/api/xtream_resolve_vod', async (req, res) => {
  let server = ensureServerUrl(req.query.server);
  const user = req.query.user;
  const pass = req.query.pass;
  const vodId = req.query.vod_id;
  const prefer = (req.query.prefer || '').toLowerCase(); // 'hls' | 'mp4'
  if (!server || !user || !pass || !vodId) return res.status(400).send('missing params');

  try {
    const info = await xtreamFetch(server, user, pass, `action=get_vod_info&vod_id=${encodeURIComponent(vodId)}`);
    const streamId = info?.movie_data?.stream_id || vodId;
    const ext = (info?.movie_data?.container_extension || 'mp4').replace(/[^a-z0-9]/ig, '') || 'mp4';

    if (prefer === 'hls') {
      const hlsUrl = `${server}/movie/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${streamId}.m3u8`;
      try {
        const r = await tryFetch(hlsUrl, { method: 'HEAD', headers: refHeaders(hlsUrl) });
        if (r.ok) return res.json({ url: hlsUrl, mime: 'application/x-mpegURL' });
      } catch {}
    }

    const fileUrl = `${server}/movie/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${streamId}.${ext}`;
    res.json({ url: fileUrl, mime: 'video/mp4' });
  } catch (e) {
    console.error('xtream_resolve_vod', e.message);
    res.status(502).send('resolve vod failed');
  }
});

/* -------------------- /api/xtream_series_info -------------------- */
app.get('/api/xtream_series_info', async (req, res) => {
  let server = ensureServerUrl(req.query.server);
  const user = req.query.user;
  const pass = req.query.pass;
  const seriesId = req.query.series_id;
  if (!server || !user || !pass || !seriesId) return res.status(400).send('missing params');

  try {
    const data = await xtreamFetch(server, user, pass, `action=get_series_info&series_id=${encodeURIComponent(seriesId)}`);
    const seasonsObj = data?.episodes || {};

    const seasons = Object.keys(seasonsObj).sort((a,b)=>+a-+b).map(k => {
      const eps = (seasonsObj[k] || []).map(e => {
        const eid = e.id || e.episode_id || e.id_episode || e.series_id;
        const ext = (e.container_extension || 'mp4').replace(/[^a-z0-9]/ig,'') || 'mp4';
        const url = `${server}/series/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${eid}.${ext}`;
        return { episode: e.episode_num || e.episode || 1, title: e.title || `Episode ${e.episode_num}`, url };
      });
      return { season: parseInt(k,10), episodes: eps };
    });

    res.json({ seasons });
  } catch (e) {
    console.error('xtream_series_info', e.message);
    res.status(502).send('series info failed');
  }
});

/* -------------------- Stub /api/tmdb (désactivé) -------------------- */
app.get('/api/tmdb', (req, res) => {
  res.json({});
});

/* -------------------- SPA fallback -------------------- */
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/hls')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* -------------------- Start -------------------- */
app.listen(PORT, () => {
  console.log(`IPTV Web Player server running on http://localhost:${PORT}`);
});
