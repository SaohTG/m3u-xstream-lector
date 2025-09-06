// public/app.js — lecteur HTML5 natif + Hls.js, titres nettoyés

document.addEventListener('DOMContentLoaded', () => {
  let allContent = [];
  let lastXtreamCreds = null;

  // UI refs
  const loginContainer = document.getElementById('login-container');
  const mainApp = document.getElementById('main-app');
  const statusMsg = document.getElementById('status-msg');

  const tabButtons = document.querySelectorAll('.tab-btn');
  const loginContents = document.querySelectorAll('.login-content');

  const heroSection = document.getElementById('hero-section');
  const contentSection = document.getElementById('content-section');
  const categoryList = document.getElementById('category-list');
  const navLinks = document.querySelectorAll('.nav-link');
  const searchInput = document.getElementById('search-bar');

  // Progress
  const pWrap = document.getElementById('progress');
  const pBar = document.getElementById('progress-bar');
  const pText = document.getElementById('progress-text');
  const pNum = document.getElementById('progress-num');

  const pWrapXt = document.getElementById('progress-xt');
  const pBarXt = document.getElementById('progress-bar-xt');
  const pTextXt = document.getElementById('progress-text-xt');
  const pNumXt = document.getElementById('progress-num-xt');

  // Player natif
  const overlay = document.getElementById('player-overlay');
  const closeBtn = document.getElementById('close-player-btn');
  const html5 = document.getElementById('html5-player');
  const titleBox = document.getElementById('player-title');
  let hls = null;

  // Tabs
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      loginContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`${btn.dataset.tab}-form`)?.classList.add('active');
    });
  });

  // Progress helpers
  function setProgress(elWrap, elBar, elNum, elText, val, label) {
    const v = Math.max(0, Math.min(100, Math.round(val || 0)));
    elWrap.classList.add('show');
    elWrap.setAttribute('aria-hidden', 'false');
    elBar.style.width = v + '%';
    elNum.textContent = v + '%';
    if (label) elText.textContent = label;
  }
  function hideProgress(elWrap) {
    elWrap.classList.remove('show');
    elWrap.setAttribute('aria-hidden', 'true');
  }

  // --------- Nettoyage titres pour affichage ---------
  function niceTitle(name) {
    if (!name) return '';
    return String(name)
      .replace(/\[[^\]]*\]|\([^\)]*\)/g, ' ')                        // [TAG] (TAG)
      .replace(/\b(19|20)\d{2}\b/g, ' ')                              // années
      .replace(/\b(4k|2160p|1080p|720p|x265|x264|hevc|h\.?264|hdr|dv|webrip|web-?dl|hdtv|dvdr?ip|brrip|bluray|cam|ts|proper|repack)\b/gi,' ')
      .replace(/\b(multi|truefrench|french|vf|vff|vfi|vost?fr)\b/gi,' ')
      .replace(/[._\-]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  // --------- Parse M3U ----------
  function parseM3U(text, onProg) {
    const lines = (text || '').replace(/\r/g, '').split('\n');
    const out = [];
    let cur = null;

    const parseAttrs = (s) => {
      const attrs = {};
      const rx = /([A-Za-z0-9\-]+)\s*=\s*"([^"]*)"|([A-Za-z0-9\-]+)\s*=\s*([^,]+)/g;
      let m; while ((m = rx.exec(s))) {
        if (m[1]) attrs[m[1]] = m[2]; else if (m[3]) attrs[m[3]] = m[4];
      }
      return attrs;
    };

    for (let i=0;i<lines.length;i++) {
      const line = lines[i].trim();
      if (!line) { if (onProg && i % 200 === 0) onProg(i / lines.length); continue; }

      if (line.startsWith('#EXTINF:')) {
        const rest = line.substring(8);
        const comma = rest.indexOf(',');
        const meta = comma >= 0 ? rest.slice(0, comma) : rest;
        const name = comma >= 0 ? rest.slice(comma + 1).trim() : 'Stream';
        cur = { name, attributes: parseAttrs(meta), location: '' };
      } else if (line.startsWith('#EXTGRP:')) {
        if (cur) cur.attributes['group-title'] = line.substring(8).trim();
      } else if (line.startsWith('#EXTVLCOPT:')) {
        const kv = line.substring('#EXTVLCOPT:'.length);
        const idx = kv.indexOf('=');
        if (idx > 0 && cur) {
          const k = kv.slice(0, idx).trim().toLowerCase();
          const v = kv.slice(idx + 1).trim();
          if (k.endsWith('group-title')) cur.attributes['group-title'] = v.replace(/^"|"$/g,'');
          if (k.endsWith('tvg-logo')) cur.attributes['tvg-logo'] = v.replace(/^"|"$/g,'');
        }
      } else if (!line.startsWith('#')) {
        if (cur) { cur.location = line; out.push(cur); cur = null; }
      }

      if (onProg && i % 200 === 0) onProg(i / lines.length);
    }
    if (onProg) onProg(1);
    return out;
  }

  // --------- Catégories / type ----------
  const CATEGORY_KEYWORDS = {
    'Action': ['action'], 'Aventure': ['aventure','adventure'], 'Animation': ['animation','anime'],
    'Comédie': ['comedie','comedy'], 'Drame': ['drame','drama'], 'Thriller': ['thriller'],
    'Crime': ['crime','policier'], 'Horreur': ['horreur','horror'], 'Science-Fiction': ['science-fiction','sci-fi','scifi','sf'],
    'Fantastique': ['fantastique','fantasy'], 'Famille': ['famille','family'], 'Romance': ['romance','romantique'],
    'Documentaire': ['documentaire','documentary','docu'], 'Historique': ['historique','history'], 'Guerre': ['guerre','war'],
    'Musique': ['musique','music'], 'Mystère': ['mystere','mystery'], 'Western': ['western'], 'Biopic': ['biopic','biography'], 'Sport': ['sport','sports']
  };
  const ALL_KEYWORDS = Object.entries(CATEGORY_KEYWORDS).flatMap(([label, keys]) => keys.map(k => [k, label]));
  const cleanText = (t)=> (t||'').toLowerCase().replace(/[._\-]/g,' ').replace(/\[[^\]]*\]|\([^\)]*\)/g,' ')
    .replace(/\b(1080p|720p|2160p|4k|x265|x264|hevc|h\.?264|webrip|web-?dl|multi|vf|vost?fr|french|aac|dts|hdtv|dvdr?ip|cam|ts|proper|repack)\b/gi,' ')
    .replace(/\s+/g,' ').trim();
  function tokensFromUrl(u){ try{ return (new URL(u).pathname.toLowerCase()).split(/[\/._\-]/).filter(Boolean);}catch{ return (u||'').toLowerCase().split(/[\/._\-]/).filter(Boolean); } }
  function guessCategoryFrom(name, url){ const text=cleanText(name); for(const [k,l] of ALL_KEYWORDS){ if(text.includes(k)) return l; } const toks=tokensFromUrl(url); for(const [k,l] of ALL_KEYWORDS){ if(toks.includes(k)) return l; } return 'Divers'; }
  function guessTypeFrom(m){
    const g=(m.attributes?.['group-title']||'').toLowerCase(), u=(m.location||'').toLowerCase(), n=(m.name||'').toLowerCase();
    if (g.includes('film')||g.includes('movie')||g.includes('vod')) return 'film';
    if (g.includes('sér')||g.includes('serie')||g.includes('series')||g.includes('shows')) return 'serie';
    if (g.includes('tv')||g.includes('live')||g.includes('chaîne')||g.includes('channel')) return 'tv';
    if (u.includes('/live/')||u.endsWith('.m3u8')) return 'tv';
    if (u.includes('/movie/')||/\.(mp4|mkv|avi|ts)(\?|$)/.test(u)) return 'film';
    if (u.includes('/series/')||/s[0-9]{1,2}e[0-9]{1,2}/i.test(n)) return 'serie';
    return 'tv';
  }

  function resolveImageUrl(raw, base) {
    if (!raw) return null;
    let u = String(raw).trim();
    if (u.toLowerCase().startsWith('picon:')) {
      u = u.slice(6);
    }
    try {
      return new URL(u, base).toString();
    } catch {
      return u;
    }
  }

  // Proxy images robuste
  function proxiedImage(rawUrl) {
    if (!rawUrl) return null;
    return `/api/image?url=${encodeURIComponent(rawUrl)}`;
  }

  // --------- Connexion M3U ----------
  document.getElementById('login-btn')?.addEventListener('click', async () => {
    const playlistUrl = (document.getElementById('m3u-url')?.value || '').trim();
    if (!playlistUrl) { statusMsg.textContent = 'Veuillez entrer une URL.'; return; }
    statusMsg.textContent = '';
    setProgress(pWrap, pBar, pNum, pText, 5, 'Connexion…');

    try {
      const resp = await fetch(`/api/m3u?url=${encodeURIComponent(playlistUrl)}`);
      if (!resp.ok) throw new Error('La playlist est inaccessible.');
      const reader = resp.body?.getReader();
      const total = Number(resp.headers.get('content-length')) || 0;
      const decoder = new TextDecoder();
      let received = 0, text = '';

      if (reader) {
        let lastShown = 5;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          received += value.length;
          text += decoder.decode(value, { stream: true });

          if (total) {
            const pct = Math.min(70, 5 + Math.floor(received / total * 65));
            if (pct - lastShown >= 1) { setProgress(pWrap, pBar, pNum, pText, pct, 'Téléchargement…'); lastShown = pct; }
          } else {
            const pct = Math.min(65, lastShown + 2);
            setProgress(pWrap, pBar, pNum, pText, pct, 'Téléchargement…');
            lastShown = pct;
          }
        }
        text += decoder.decode();
      } else {
        text = await resp.text();
        setProgress(pWrap, pBar, pNum, pText, 70, 'Téléchargement terminé');
      }

      setProgress(pWrap, pBar, pNum, pText, 72, 'Analyse de la playlist…');
      const medias = parseM3U(text, frac => setProgress(pWrap, pBar, pNum, pText, 70 + Math.floor(15 * frac), 'Analyse de la playlist…'));

        const items = medias.map(m => {
          const type = guessTypeFrom(m);
          const rawImg = m.attributes['tvg-logo'] || m.attributes['logo'] || null;
          const image = resolveImageUrl(rawImg, playlistUrl);
          const group = m.attributes['group-title'] || ((type === 'film' || type === 'serie') ? guessCategoryFrom(m.name, m.location) : 'Live');
          return { type, name: m.name || 'Stream', display: niceTitle(m.name || 'Stream'), image, url: m.location, group };
        });
      if (!items.length) { setProgress(pWrap, pBar, pNum, pText, 100, 'Terminé'); statusMsg.textContent = 'Aucun élément trouvé dans cette playlist.'; hideProgress(pWrap); return; }

      setProgress(pWrap, pBar, pNum, pText, 100, 'Terminé');

      allContent = items;
      lastXtreamCreds = null;
      hideProgress(pWrap);
      startApp();
    } catch (e) {
      setProgress(pWrap, pBar, pNum, pText, 100, 'Erreur');
      statusMsg.textContent = `Erreur : ${e.message}`;
      setTimeout(()=>hideProgress(pWrap), 500);
    }
  });

  // --------- Connexion Xtream ----------
  document.getElementById('login-btn-xtream')?.addEventListener('click', async () => {
    let server = (document.getElementById('xtream-server')?.value || '').trim();
    const user   = (document.getElementById('xtream-user')?.value || '').trim();
    const pass   = (document.getElementById('xtream-pass')?.value || '').trim();
    if (!server || !user || !pass) { statusMsg.textContent = 'Veuillez remplir tous les champs.'; return; }
    if (!/^https?:\/\//i.test(server)) server = 'http://' + server;

    statusMsg.textContent = '';
    setProgress(pWrapXt, pBarXt, pNumXt, pTextXt, 10, 'Connexion…');
    try {
      const r = await fetch(`/api/xtream?server=${encodeURIComponent(server)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}`);
      setProgress(pWrapXt, pBarXt, pNumXt, pTextXt, 45, 'Réception…');
      if (!r.ok) {
        const t = await r.text().catch(()=> '');
        throw new Error(t || 'Échec de la connexion à l’API.');
      }
      const items = await r.json() || [];
      setProgress(pWrapXt, pBarXt, pNumXt, pTextXt, 80, 'Traitement…');
      if (!items.length) throw new Error('Aucun contenu retourné par le panel.');
      // Ajoute display = niceTitle
      allContent = items.map(i => ({ ...i, display: niceTitle(i.name) }));
      lastXtreamCreds = { server, user, pass };
      setProgress(pWrapXt, pBarXt, pNumXt, pTextXt, 100, 'Terminé');
      hideProgress(pWrapXt);
      startApp();
    } catch (e) {
      setProgress(pWrapXt, pBarXt, pNumXt, pTextXt, 100, 'Erreur');
      statusMsg.textContent = `Erreur Xtream : ${e.message}`;
      setTimeout(()=>hideProgress(pWrapXt), 500);
    }
  });

  // --------- UI (catégories + grilles) ----------
  function firstAvailableType() {
    const hasFilm  = allContent.some(i => i.type === 'film');
    const hasSerie = allContent.some(i => i.type === 'serie');
    const hasTv    = allContent.some(i => i.type === 'tv');
    if (hasFilm) return 'film'; if (hasSerie) return 'serie'; if (hasTv) return 'tv'; return 'film';
  }
  function setActiveNav(type) { navLinks.forEach(l => l.classList.toggle('active', l.dataset.content === type)); }

  const slugify = (t) => (t||'Divers').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  let _lazyObserver=null;
  function ensureLazyObserver(){ if(_lazyObserver) return _lazyObserver; _lazyObserver=new IntersectionObserver((entries)=>{entries.forEach(entry=>{if(entry.isIntersecting){const el=entry.target,url=el.dataset.bg;if(url){el.style.backgroundImage=`url(${url})`;el.classList.remove('lazy-bg');delete el.dataset.bg;} _lazyObserver.unobserve(el);}});},{root:null,rootMargin:'300px',threshold:0.01});return _lazyObserver;}
  function setLazyBackground(el,url){ if(el&&url){ el.dataset.bg=url; el.classList.add('lazy-bg'); ensureLazyObserver().observe(el); } }

  function buildCategorySidebar(type) {
    categoryList.innerHTML = '';
    const items = allContent.filter(i => i.type === type);
    const groups = {};
    for (const it of items) groups[it.group || 'Divers'] = (groups[it.group || 'Divers'] || 0) + 1;

    const keys = Object.keys(groups).sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
    if (!keys.length) { const p=document.createElement('div'); p.style.opacity='0.6'; p.style.fontSize='12px'; p.textContent='Aucune catégorie'; categoryList.appendChild(p); return; }
    for (const g of keys) {
      const chip = document.createElement('div');
      chip.className = 'category-chip';
      const anchor = slugify(g);
      chip.innerHTML = `<span>${g}</span><span class="count">${groups[g]}</span>`;
      chip.addEventListener('click', () => { document.getElementById(`cat-${anchor}`)?.scrollIntoView({behavior:'smooth',block:'start'}); });
      categoryList.appendChild(chip);
    }
  }

  function displayHero(item) {
    if (!item) { heroSection.style.display = 'none'; return; }
    heroSection.style.display = 'block';
    const bg = proxiedImage(item.image);
    if (bg) heroSection.style.backgroundImage = `linear-gradient(to right, rgba(12,12,12,0.8) 20%, transparent 60%), url(${bg})`;
    heroSection.innerHTML = `<div class="hero-content">
      <h2 class="hero-title">${item.display || item.name}</h2>
      <div class="hero-actions">
        <button class="play-button" ${item.type==='film'||(item.type==='tv'&&item.url)?'':'disabled'}><i class="fas fa-play"></i> Lecture</button>
        <button class="info-button"><i class="fas fa-info-circle"></i> Infos</button>
      </div>
    </div>`;
    const btn = heroSection.querySelector('.play-button');
    if (btn) {
      if (item.type === 'film') btn.addEventListener('click', () => playVod(item));
      else if (item.type === 'tv' && item.url) btn.addEventListener('click', () => playStream(item.url, item.display || item.name));
    }
  }

  function displayContent(type) {
    contentSection.innerHTML = '';
    const items = allContent.filter(i => i.type === type);
    if (!items.length) { const next=firstAvailableType(); if(next!==type){ setActiveNav(next); displayContent(next); } return; }

    const groups = {};
    for (const it of items) (groups[it.group || 'Divers'] ||= []).push(it);

    buildCategorySidebar(type);

    const groupKeys = Object.keys(groups).sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
    for (const g of groupKeys) {
      const row = document.createElement('div');
      row.className = 'category-row';
      const anchor = slugify(g);
      row.id = `cat-${anchor}`;
      row.innerHTML = `<h3 class="category-title">${g}</h3><div class="row-content"></div>`;
      const rc = row.querySelector('.row-content');

      // 🔧 FIX: on trie avec a/b (plus de 'it' ici)
      for (const it of groups[g].sort((a,b)=>((a.display||a.name||'').localeCompare(b.display||b.name||'','fr',{sensitivity:'base'})))) {
        const card = document.createElement('div');
        card.className = 'content-card';
        const imgUrl = proxiedImage(it.image);
        if (imgUrl) setLazyBackground(card, imgUrl);
        card.innerHTML = `<div class="card-title">${it.display || it.name}</div>`;

        if (it.type === 'film') {
          card.addEventListener('click', () => playVod(it));
          const play = document.createElement('button'); play.className='play'; play.innerHTML='<i class="fas fa-play"></i>';
          play.addEventListener('click', (e)=>{ e.stopPropagation(); playVod(it); });
          card.appendChild(play);
        } else if (it.type === 'tv' && it.url) {
          card.addEventListener('click', () => playStream(it.url, it.display || it.name));
          const play = document.createElement('button'); play.className='play'; play.innerHTML='<i class="fas fa-play"></i>';
          play.addEventListener('click', (e)=>{ e.stopPropagation(); playStream(it.url, it.display || it.name); });
          card.appendChild(play);
        } else if (it.type === 'serie') {
          card.addEventListener('click', () => openSeries(it));
        }
        rc.appendChild(card);
      }
      contentSection.appendChild(row);
    }
  }

  // --------- Player HTML5 + Hls.js ----------
  function sourceFor(url) {
    const base = url.split('?')[0].toLowerCase();
    if (base.endsWith('.m3u8')) return { kind: 'hls', src: `/hls?url=${encodeURIComponent(url)}` };
    return { kind: 'file', src: `/stream?url=${encodeURIComponent(url)}` };
  }

  function showOverlay(title) {
    titleBox.textContent = title || '';
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
  }
  function closeOverlay() {
    try { html5.pause(); } catch {}
    if (hls) { try { hls.destroy(); } catch {} hls = null; }
    html5.removeAttribute('src'); html5.load();
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  }
  ['click','pointerdown','touchend'].forEach(ev => closeBtn.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); closeOverlay(); }, { passive:false }));
  overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('show')) closeOverlay(); });

  html5.addEventListener('error', () => {
    alert('Lecture impossible (source/codec non supporté ou flux indisponible).');
  });

  function playStream(url, title = '') {
    const src = sourceFor(url);
    showOverlay(title);

    // reset
    if (hls) { try { hls.destroy(); } catch {} hls = null; }
    html5.pause();
    html5.removeAttribute('src');
    html5.load();

    if (src.kind === 'hls') {
      if (html5.canPlayType('application/vnd.apple.mpegurl')) {
        html5.src = src.src;
        html5.play().catch(()=>{});
      } else if (window.Hls && window.Hls.isSupported()) {
        hls = new Hls({
          maxBufferLength: 30,
          backBufferLength: 60,
          enableWorker: true,
        });
        hls.loadSource(src.src);
        hls.attachMedia(html5);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          html5.play().catch(()=>{});
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data?.fatal) {
            try { hls.destroy(); } catch {}
            hls = null;
            alert('Lecture impossible (flux HLS indisponible).');
          }
        });
      } else {
        html5.src = src.src;
        html5.play().catch(()=>alert('Lecture impossible (HLS non supporté).'));
      }
    } else {
      html5.src = src.src; // /stream gère Range + Referer (côté serveur)
      html5.play().catch(()=>{ html5.muted = true; html5.play().catch(()=>{}); });
    }
  }

  async function playVod(item){
    if (lastXtreamCreds && item.stream_id) {
      try{
        const {server,user,pass}=lastXtreamCreds;
        const r=await fetch(`/api/xtream_resolve_vod?server=${encodeURIComponent(server)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&vod_id=${encodeURIComponent(item.stream_id)}&prefer=mp4`);
        if(r.ok){ const info=await r.json(); playStream(info.url, item.display || item.name); return; }
      }catch(e){ console.error('resolve_vod error',e); }
    }
    if (item.url) playStream(item.url, item.display || item.name);
    else alert('Source VOD introuvable.');
  }

  async function openSeries(item){
    if(!lastXtreamCreds || !item.series_id){ alert('Episodes indisponibles (M3U ou identifiants Xtream manquants).'); return; }
    const {server,user,pass}=lastXtreamCreds;
    try{
      statusMsg.textContent='Chargement des épisodes...';
      const r=await fetch(`/api/xtream_series_info?server=${encodeURIComponent(server)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&series_id=${encodeURIComponent(item.series_id)}`);
      if(!r.ok) throw new Error('series_info_failed');
      const data=await r.json(); statusMsg.textContent='';
      const s0=(data.seasons||[])[0]; const e0=s0?.episodes?.[0];
      if(e0?.url) playStream(e0.url,`${niceTitle(item.name)} S${s0.season}E${e0.episode||1} - ${niceTitle(e0.title)}`);
    }catch(e){ statusMsg.textContent=''; alert('Impossible de charger les épisodes.'); }
  }

  // --------- Navigation + rendu ----------
  function firstAvailableType() {
    const hasFilm  = allContent.some(i => i.type === 'film');
    const hasSerie = allContent.some(i => i.type === 'serie');
    const hasTv    = allContent.some(i => i.type === 'tv');
    if (hasFilm) return 'film'; if (hasSerie) return 'serie'; if (hasTv) return 'tv'; return 'film';
  }

  function startApp() {
    loginContainer.style.display = 'none';
    mainApp.style.display = 'block';
    const initType = firstAvailableType();
    const first = allContent.find(i => i.type === initType && i.image) || allContent.find(i => i.type === initType) || null;
    displayHero(first);
    setActiveNav(initType);
    displayContent(initType);
  }

  // Recherche
  searchInput?.addEventListener('input', (e) => {
    const q = (e.target.value || '').trim().toLowerCase();
    contentSection.querySelectorAll('.content-card').forEach(card => {
      const t = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
      card.style.display = t.includes(q) ? '' : 'none';
    });
  });

  navLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      navLinks.forEach(l => l.classList.remove('active')); link.classList.add('active');
      if (searchInput) searchInput.value = '';
      const target = link.dataset.content;
      if (target === 'tv') {
        const hasTv = allContent.some(i => i.type === 'tv');
        if (!hasTv && lastXtreamCreds) {
          statusMsg.textContent = 'Chargement des chaînes TV...';
          try {
            const { server, user, pass } = lastXtreamCreds;
            const r = await fetch(`/api/xtream_live?server=${encodeURIComponent(server)}&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}`);
            if (r.ok) allContent = allContent.concat((await r.json() || []).map(i => ({ ...i, display: niceTitle(i.name) })));
          } catch(e){ console.error(e); }
          finally { statusMsg.textContent = ''; }
        }
      }
      displayContent(target);
    });
  });
});
