import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { PlaylistsService } from '../playlists/playlists.service';
import { ProgressService } from '../progress/progress.service';

type RailItem = {
  id: string;
  title: string;
  poster?: string | null;
  year?: number | null;
  category?: string | null;
  added_at?: number | null;
};
type Rail = { key: string; title: string; items: RailItem[] };

@Injectable()
export class VodService {
  constructor(
    private readonly playlists: PlaylistsService,
    private readonly progress: ProgressService,
  ) {}

  // ========= Helpers Xtream =========
  private xt(base: string, user: string, pass: string) {
    const u = new URL('/player_api.php', base);
    u.searchParams.set('username', user);
    u.searchParams.set('password', pass);
    return u;
  }

  private async xtGet(base: URL, params: Record<string, string | number>) {
    const u = new URL(base.toString());
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v)));
    const resp = await axios.get(u.toString(), {
      timeout: 15000,
      validateStatus: (s) => s >= 200 && s < 500,
    });
    if (resp.status >= 400) throw new BadRequestException(`Xtream ${resp.status}`);
    return resp.data;
  }

  private async getXtreamBase(userId: string) {
    const pl = await this.playlists.getActiveForUser(userId);
    if (!pl) throw new BadRequestException('Aucune source liée');
    if (pl.type !== 'XTREAM') throw new BadRequestException('Disponible uniquement pour Xtream pour le moment.');
    const baseUrl = pl.base_url!.replace(/\/+$/, '');
    return { baseUrl, user: pl.username!, pass: pl.password! };
  }

  private toPct(p: number, d: number) {
    if (!d) return 0;
    return Math.round((p / d) * 100);
  }

  // ========= Rails "Continuer" =========
  private async continueMoviesRail(userId: string): Promise<Rail | null> {
    const pl = await this.playlists.getActiveForUser(userId);
    if (!pl || pl.type !== 'XTREAM') return null;

    const rows = await this.progress.listInProgress(userId, 'MOVIE', 20);
    if (!rows.length) return null;

    const base = this.xt(pl.base_url!, pl.username!, pl.password!);
    const limited = rows.slice(0, 15);

    const metas = await Promise.all(limited.map(async (r) => {
      try {
        const data = await this.xtGet(base, { action: 'get_vod_info', vod_id: r.ref_id });
        const info = data?.info || {};
        return {
          ok: true,
          id: String(r.ref_id),
          title: String(info.name || info.title || '').trim(),
          poster: info.movie_image || info.cover || null,
          year: info.releasedate ? Number(String(info.releasedate).slice(0, 4)) : (info.year ? Number(info.year) : null),
          pct: this.toPct(r.position, r.duration),
        };
      } catch {
        return { ok: false };
      }
    }));

    const items: RailItem[] = metas
      .filter((m: any) => m.ok)
      .map((m: any) => ({
        id: m.id,
        title: `${m.title} • ${m.pct}%`,
        poster: m.poster,
        year: m.year || null,
        category: 'Continuer',
        added_at: null,
      }));

    if (!items.length) return null;
    return { key: 'continue-movies', title: 'Continuer les films', items };
  }

  private async continueEpisodesRail(userId: string): Promise<Rail | null> {
    const pl = await this.playlists.getActiveForUser(userId);
    if (!pl || pl.type !== 'XTREAM') return null;

    const rows = await this.progress.listInProgress(userId, 'EPISODE', 20);
    if (!rows.length) return null;

    const base = this.xt(pl.base_url!, pl.username!, pl.password!);

    const items: RailItem[] = [];
    const bySeries: Record<string, typeof rows> = {};
    rows.forEach((r) => {
      const sid = String(r.series_id || 'unknown');
      bySeries[sid] = bySeries[sid] || [];
      bySeries[sid].push(r);
    });

    for (const [seriesId, list] of Object.entries(bySeries)) {
      if (!seriesId || seriesId === 'unknown') continue;
      try {
        const data = await this.xtGet(base, { action: 'get_series_info', series_id: seriesId });
        const info = data?.info || {};
        const cover = info.cover || info.backdrop_path || null;
        const episodesMap: Record<string, any> = {};
        Object.values<any>(data?.episodes || {}).flat().forEach((e: any) => {
          episodesMap[String(e.id)] = e;
        });

        list.slice(0, 6).forEach((r) => {
          const e = episodesMap[String(r.ref_id)];
          if (!e) return;
          const epNum = Number(e.episode_num || e.episode) || 0;
          const title = String(info.name || '').trim();
          const pct = this.toPct(r.position, r.duration);
          items.push({
            id: String(r.ref_id),
            title: `${title} – E${String(epNum).padStart(2, '0')} • ${pct}%`,
            poster: cover,
            category: 'Continuer',
            year: null,
            added_at: null,
          });
        });
      } catch {
        // ignore
      }
    }

    if (!items.length) return null;
    return { key: 'continue-episodes', title: 'Continuer les épisodes', items: items.slice(0, 15) };
  }

  // ========= FILMS =========
  async getMovieRails(userId: string): Promise<Rail[]> {
    const rails: Rail[] = [];

    const cont = await this.continueMoviesRail(userId);
    if (cont) rails.push(cont);

    const pl = await this.playlists.getActiveForUser(userId);
    if (!pl) throw new BadRequestException('Aucune source liée');

    if (pl.type === 'XTREAM') {
      const base = this.xt(pl.base_url!, pl.username!, pl.password!);
      const [cats, list] = await Promise.all([
        this.xtGet(base, { action: 'get_vod_categories' }),
        this.xtGet(base, { action: 'get_vod_streams' }),
      ]);

      const catNames: Record<string, string> = {};
      (cats || []).forEach((c: any) => (catNames[c.category_id] = c.category_name));

      const recents = [...(list || [])]
        .sort((a: any, b: any) => (b.added || 0) - (a.added || 0))
        .slice(0, 30)
        .map((m: any) => ({
          id: String(m.stream_id),
          title: String(m.name || '').trim(),
          poster: m.stream_icon || null,
          year: m.year ? Number(m.year) : null,
          category: catNames[m.category_id] || null,
          added_at: m.added ? Number(m.added) : null,
        }));
      rails.push({ key: 'recent', title: 'Récemment ajoutés', items: recents });

      for (let y = new Date().getFullYear(); y >= 2018; y--) {
        const items = (list || [])
          .filter((m: any) => Number(m.year) === y)
          .slice(0, 30)
          .map((m: any) => ({
            id: String(m.stream_id),
            title: String(m.name || '').trim(),
            poster: m.stream_icon || null,
            year: m.year ? Number(m.year) : null,
            category: catNames[m.category_id] || null,
            added_at: m.added ? Number(m.added) : null,
          }));
        if (items.length) rails.push({ key: `y-${y}`, title: `Films ${y}`, items });
      }

      const byCat: Record<string, RailItem[]> = {};
      (list || []).forEach((m: any) => {
        const it: RailItem = {
          id: String(m.stream_id),
          title: String(m.name || '').trim(),
          poster: m.stream_icon || null,
          year: m.year ? Number(m.year) : null,
          category: catNames[m.category_id] || null,
          added_at: m.added ? Number(m.added) : null,
        };
        const key = it.category || 'Divers';
        byCat[key] = byCat[key] || [];
        byCat[key].push(it);
      });
      Object.keys(byCat).forEach((k) =>
        rails.push({ key: `c-${k}`, title: k, items: byCat[k].slice(0, 30) }),
      );

      return rails;
    }

    return rails;
  }

  async getMovieDetails(userId: string, movieId: string) {
    const pl = await this.playlists.getActiveForUser(userId);
    if (!pl) throw new BadRequestException('Aucune source liée');
    if (pl.type !== 'XTREAM') throw new BadRequestException('Détail film disponible uniquement pour Xtream pour le moment.');

    const base = this.xt(pl.base_url!, pl.username!, pl.password!);
    const data = await this.xtGet(base, { action: 'get_vod_info', vod_id: movieId });
    const info = data?.info || {};
    return {
      id: String(movieId),
      title: String(info.name || info.title || '').trim(),
      description: info.plot || '',
      rating: typeof info.rating === 'number' ? info.rating : Number(info.rating || 0) || null,
      poster: info.movie_image || info.cover || null,
      backdrop: info.backdrop_path || null,
      released: info.releasedate || null,
      year: info.releasedate ? Number(String(info.releasedate).slice(0, 4)) : (info.year ? Number(info.year) : null),
      genres: info.genre ? String(info.genre).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      container_extension: info?.container_extension || null,
    };
  }

  async getMovieStreamUrl(userId: string, movieId: string) {
    const pl = await this.playlists.getActiveForUser(userId);
    if (!pl) throw new BadRequestException('Aucune source liée');
    if (pl.type !== 'XTREAM') throw new BadRequestException('Lecture films disponible uniquement pour Xtream pour le moment.');

    const baseUrl = pl.base_url!.replace(/\/+$/, '');
    let ext = 'mp4';
    try {
      const base = this.xt(pl.base_url!, pl.username!, pl.password!);
      const data = await this.xtGet(base, { action: 'get_vod_info', vod_id: movieId });
      ext = data?.info?.container_extension || 'mp4';
    } catch {}
    const url = `${baseUrl}/movie/${encodeURIComponent(pl.username!)}/${encodeURIComponent(pl.password!)}/${encodeURIComponent(movieId)}.${ext}`;
    return { url };
  }

  // ========= SÉRIES =========
  async getShowRails(userId: string): Promise<Rail[]> {
    const rails: Rail[] = [];

    const cont = await this.continueEpisodesRail(userId);
    if (cont) rails.push(cont);

    const pl = await this.playlists.getActiveForUser(userId);
    if (!pl) throw new BadRequestException('Aucune source liée');

    if (pl.type === 'XTREAM') {
      const base = this.xt(pl.base_url!, pl.username!, pl.password!);
      const [cats, list] = await Promise.all([
        this.xtGet(base, { action: 'get_series_categories' }),
        this.xtGet(base, { action: 'get_series' }),
      ]);

      const catNames: Record<string, string> = {};
      (cats || []).forEach((c: any) => (catNames[c.category_id] = c.category_name));

      const recents = [...(list || [])]
        .sort((a: any, b: any) => (b.added || 0) - (a.added || 0))
        .slice(0, 30)
        .map((s: any) => ({
          id: String(s.series_id),
          title: String(s.name || '').trim(),
          poster: s.cover || null,
          year: s.releaseDate ? Number(String(s.releaseDate).slice(0, 4)) : null,
          category: catNames[s.category_id] || null,
          added_at: s.added ? Number(s.added) : null,
        }));
      rails.push({ key: 'recent', title: 'Nouveautés séries', items: recents });

      const byCat: Record<string, RailItem[]> = {};
      (list || []).forEach((s: any) => {
        const it: RailItem = {
          id: String(s.series_id),
          title: String(s.name || '').trim(),
          poster: s.cover || null,
          year: s.releaseDate ? Number(String(s.releaseDate).slice(0, 4)) : null,
          category: catNames[s.category_id] || null,
          added_at: s.added ? Number(s.added) : null,
        };
        const key = it.category || 'Divers';
        byCat[key] = byCat[key] || [];
        byCat[key].push(it);
      });
      Object.keys(byCat).forEach((k) =>
        rails.push({ key: `c-${k}`, title: k, items: byCat[k].slice(0, 30) }),
      );

      return rails;
    }

    return rails;
  }

  async getSeriesDetails(userId: string, seriesId: string) {
    const pl = await this.playlists.getActiveForUser(userId);
    if (!pl) throw new BadRequestException('Aucune source liée');
    if (pl.type !== 'XTREAM') throw new BadRequestException('Détail séries disponible uniquement pour Xtream pour le moment.');

    const base = this.xt(pl.base_url!, pl.username!, pl.password!);
    const data = await this.xtGet(base, { action: 'get_series_info', series_id: seriesId });
    const info = data?.info || {};
    return {
      id: String(seriesId),
      title: String(info.name || '').trim(),
      description: info.plot || '',
      rating: typeof info.rating === 'number' ? info.rating : Number(info.rating || 0) || null,
      poster: info.cover || null,
      backdrop: info.backdrop_path || info.movie_image || null,
      released: info.releasedate || null,
      genres: info.genre ? String(info.genre).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    };
  }

  async getSeriesSeasons(userId: string, seriesId: string) {
    const pl = await this.playlists.getActiveForUser(userId);
    if (!pl) throw new BadRequestException('Aucune source liée');
    if (pl.type !== 'XTREAM') throw new BadRequestException('Saisons/épisodes disponibles uniquement pour Xtream pour le moment.');

    const base = this.xt(pl.base_url!, pl.username!, pl.password!);
    const data = await this.xtGet(base, { action: 'get_series_info', series_id: seriesId });
    const eps = data?.episodes || {};
    const seasons: Array<{
      season: number;
      episodes: Array<{ id: string; number: number; title: string; ext?: string | null; duration?: number | null }>;
    }> = [];

    Object.keys(eps)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((s) => {
        const seasonNum = Number(s);
        const list = (eps[s] || []).map((e: any) => ({
          id: String(e.id),
          number: Number(e.episode_num || e.episode) || 0,
          title: String(e.title || `Episode ${e.episode_num || e.episode || ''}`).trim(),
          ext: e.container_extension || null,
          duration: e.duration ? Number(e.duration) : null,
        }));
        seasons.push({ season: seasonNum, episodes: list });
      });

    return { seriesId: String(seriesId), seasons };
  }

  async getEpisodeStreamUrl(userId: string, episodeId: string) {
    const pl = await this.playlists.getActiveForUser(userId);
    if (!pl) throw new BadRequestException('Aucune source liée');
    if (pl.type !== 'XTREAM') throw new BadRequestException('Lecture épisodes disponible uniquement pour Xtream pour le moment.');

    const baseUrl = pl.base_url!.replace(/\/+$/, '');
    const url = `${baseUrl}/series/${encodeURIComponent(pl.username!)}/${encodeURIComponent(pl.password!)}/${encodeURIComponent(episodeId)}.mp4`;
    return { url };
  }

  // ========= TV : rails =========
  async getLiveRails(userId: string): Promise<Rail[]> {
    const pl = await this.playlists.getActiveForUser(userId);
    if (!pl) throw new BadRequestException('Aucune source liée');
    if (pl.type !== 'XTREAM') return [];

    const base = this.xt(pl.base_url!, pl.username!, pl.password!);
    const [cats, list] = await Promise.all([
      this.xtGet(base, { action: 'get_live_categories' }),
      this.xtGet(base, { action: 'get_live_streams' }),
    ]);

    const catNames: Record<string, string> = {};
    (cats || []).forEach((c: any) => (catNames[c.category_id] = c.category_name));

    const byCat: Record<string, RailItem[]> = {};
    (list || []).forEach((ch: any) => {
      const it: RailItem = {
        id: String(ch.stream_id),
        title: String(ch.name || '').trim(),
        poster: ch.stream_icon || null,
        category: catNames[ch.category_id] || null,
        added_at: ch.added ? Number(ch.added) : null,
      };
      const key = it.category || 'Divers';
      byCat[key] = byCat[key] || [];
      byCat[key].push(it);
    });

    const rails: Rail[] = [];
    Object.keys(byCat).forEach((k) =>
      rails.push({ key: `c-${k}`, title: k, items: byCat[k].slice(0, 30) }),
    );
    return rails;
  }

  // ========= TV : URL directe =========
  async getLiveStreamUrl(userId: string, streamId: string) {
    const { baseUrl, user, pass } = await this.getXtreamBase(userId);
    const url = `${baseUrl}/live/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${encodeURIComponent(streamId)}.m3u8`;
    return { url };
  }

  // ========= TV : Proxy HLS =========
  async getLiveHlsManifest(userId: string, streamId: string): Promise<string> {
    const { baseUrl, user, pass } = await this.getXtreamBase(userId);
    const upstreamBase = `${baseUrl}/live/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${encodeURIComponent(streamId)}`;
    const manifestUrl = `${upstreamBase}.m3u8`;

    const resp = await axios.get(manifestUrl, {
      responseType: 'text' as any,
      transformResponse: (x) => x,
      timeout: 15000,
      validateStatus: (s) => s >= 200 && s < 500,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*',
      },
    });
    if (resp.status >= 400 || typeof resp.data !== 'string') {
      throw new BadRequestException(`Upstream manifest ${resp.status}`);
    }

    const text: string = resp.data;
    const origin = new URL(baseUrl).origin;

    const rewriteUri = (raw: string) => {
      if (/^https?:\/\//i.test(raw)) {
        return `/vod/live/${encodeURIComponent(streamId)}/hls/seg?u=${encodeURIComponent(raw)}`;
      }
      if (raw.startsWith('/')) {
        return `/vod/live/${encodeURIComponent(streamId)}/hls/seg?u=${encodeURIComponent(origin + raw)}`;
      }
      return `/vod/live/${encodeURIComponent(streamId)}/hls/${encodeURI(raw)}`;
    };

    const rewritten = text
      .split('\n')
      .map((line) => {
        const l = line.trim();
        if (!l) return line;

        if (l.startsWith('#EXT-X-KEY') || l.startsWith('#EXT-X-MAP')) {
          return line.replace(/URI="([^"]+)"/, (_m, g1) => `URI="${rewriteUri(g1)}"`);
        }
        if (l.startsWith('#')) return line;
        return rewriteUri(l);
      })
      .join('\n');

    return rewritten;
  }

  async pipeLiveAbsoluteSegment(userId: string, _streamId: string, u: string, res: any) {
    const { baseUrl } = await this.getXtreamBase(userId);

    const raw = String(u || '');
    const decodedOnce = decodeURIComponent(raw);

    let url: URL;
    try {
      url = new URL(decodedOnce);
    } catch {
      url = new URL(raw);
    }

    const base = new URL(baseUrl);

    const urlHost = url.hostname.toLowerCase();
    const baseHost = base.hostname.toLowerCase();
    if (urlHost !== baseHost) {
      throw new BadRequestException(`Host non autorisé: ${urlHost} != ${baseHost}`);
    }

    const p = url.pathname;
    const allowed =
      p.startsWith('/live/') ||
      p.startsWith('/play/') ||
      p.startsWith('/hls') ||
      p.startsWith('/hls-nginx') ||
      p.endsWith('.m3u8') ||
      p.endsWith('.ts') ||
      p.endsWith('.key');
    if (!allowed) {
      throw new BadRequestException(`Chemin non autorisé: ${p}`);
    }

    const upstream = await axios.get(url.toString(), {
      responseType: 'stream',
      timeout: 20000,
      validateStatus: (s) => s >= 200 && s < 500,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*',
      },
    });
    if (upstream.status >= 400) throw new BadRequestException(`Upstream ${upstream.status}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    if (upstream.headers['content-type']) {
      res.setHeader('Content-Type', upstream.headers['content-type'] as string);
    }
    upstream.data.pipe(res);
  }

  async pipeLiveRelativePath(
    userId: string,
    streamId: string,
    assetPath: string,
    query: Record<string, any>,
    res: any,
  ) {
    const { baseUrl, user, pass } = await this.getXtreamBase(userId);

    const decoded = decodeURIComponent(String(assetPath || ''));
    const safe = decoded.replace(/^\/+/, '');
    if (safe.includes('..')) throw new BadRequestException('Chemin non autorisé');

    const qs = new URLSearchParams();
    Object.entries(query || {}).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((vv) => qs.append(k, String(vv)));
      else if (v != null) qs.append(k, String(v));
    });
    const qstr = qs.toString();

    const upstream = `${baseUrl}/live/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${encodeURIComponent(streamId)}/${encodeURI(safe)}${qstr ? `?${qstr}` : ''}`;

    const r = await axios.get(upstream, {
      responseType: 'stream',
      timeout: 20000,
      validateStatus: (s) => s >= 200 && s < 500,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*',
      },
    });
    if (r.status >= 400) throw new BadRequestException(`Upstream ${r.status}`);

    res.setHeader('Access-Control-Allow-Origin', '*');

    const ct = (r.headers['content-type'] as string) || '';
    if (ct) {
      res.setHeader('Content-Type', ct);
    } else {
      if (safe.endsWith('.m3u8')) res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      else if (safe.endsWith('.ts')) res.setHeader('Content-Type', 'video/mp2t');
      else if (safe.endsWith('.key')) res.setHeader('Content-Type', 'application/octet-stream');
    }

    r.data.pipe(res);
  }
}
