import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { PlaylistsService } from '../playlists/playlists.service';

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
  constructor(private readonly playlists: PlaylistsService) {}

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

  // ========= FILMS =========
  async getMovieRails(userId: string): Promise<Rail[]> {
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

      const rails: Rail[] = [];

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

    return [];
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

      const rails: Rail[] = [];

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

    return [];
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

  // ========= TV : URL directe (optionnel) =========
  async getLiveStreamUrl(userId: string, streamId: string) {
    const { baseUrl, user, pass } = await this.getXtreamBase(userId);
    const url = `${baseUrl}/live/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${encodeURIComponent(streamId)}.m3u8`;
    return { url };
  }

  // ========= TV : Proxy HLS (manifeste + segments) =========
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept': '*/*',
      },
    });
    if (resp.status >= 400 || typeof resp.data !== 'string') {
      throw new BadRequestException(`Upstream manifest ${resp.status}`);
    }

    const text: string = resp.data;
    const origin = new URL(baseUrl).origin;

    // Réécriture : 
    // - URL absolue -> seg?u=...
    // - Chemin commençant par "/" -> seg?u=origin + path
    // - Chemin relatif -> wildcard /hls/<assetPath> (encodeURI conserve les "/")
    const rewritten = text
      .split('\n')
      .map((line) => {
        const l = line.trim();
        if (!l || l.startsWith('#')) return line;
        if (/^https?:\/\//i.test(l)) {
          return `/vod/live/${encodeURIComponent(streamId)}/hls/seg?u=${encodeURIComponent(l)}`;
        }
        if (l.startsWith('/')) {
          return `/vod/live/${encodeURIComponent(streamId)}/hls/seg?u=${encodeURIComponent(origin + l)}`;
        }
        return `/vod/live/${encodeURIComponent(streamId)}/hls/${encodeURI(l)}`;
      })
      .join('\n');

    return rewritten;
  }

  async pipeLiveAbsoluteSegment(userId: string, streamId: string, u: string, res: any) {
    const { baseUrl } = await this.getXtreamBase(userId);
    const url = new URL(u);
    const base = new URL(baseUrl);
    if (url.host !== base.host) throw new BadRequestException('Host non autorisé');

    // Autoriser les chemins HLS communs (live/, play/, hls/, etc.)
    const allowed =
      url.pathname.startsWith('/live/') ||
      url.pathname.startsWith('/play/') ||
      url.pathname.startsWith('/hls') ||
      url.pathname.endsWith('.m3u8') ||
      url.pathname.endsWith('.ts');
    if (!allowed) throw new BadRequestException('Chemin non autorisé');

    const upstream = await axios.get(url.toString(), {
      responseType: 'stream',
      timeout: 15000,
      validateStatus: (s) => s >= 200 && s < 500,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept': '*/*',
      },
    });
    if (upstream.status >= 400) throw new BadRequestException(`Upstream ${upstream.status}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    if (upstream.headers['content-type']) res.setHeader('Content-Type', upstream.headers['content-type'] as string);
    upstream.data.pipe(res);
  }

  // Chemin relatif imbriqué (ex: "720p/seg-001.ts")
  async pipeLiveRelativePath(userId: string, streamId: string, assetPath: string, res: any) {
    const { baseUrl, user, pass } = await this.getXtreamBase(userId);

    // décoder et assainir
    const decoded = decodeURIComponent(String(assetPath || ''));
    const safe = decoded.replace(/^\/+/, '');
    if (safe.includes('..')) throw new BadRequestException('Chemin non autorisé');

    const upstreamPath = `${baseUrl}/live/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${encodeURIComponent(streamId)}/${encodeURI(safe)}`;

    const r = await axios.get(upstreamPath, {
      responseType: 'stream',
      timeout: 15000,
      validateStatus: (s) => s >= 200 && s < 500,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
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
    }

    r.data.pipe(res);
  }
}
