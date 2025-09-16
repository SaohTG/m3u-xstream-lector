import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as https from 'https';
import { Playlist } from './playlist.entity';

type LinkM3UDto = {
  type: 'm3u';
  m3u_url?: string;
  url?: string;
  name?: string;
};

type LinkXtreamDto = {
  type: 'xtream';
  base_url: string; // host ou URL (http/https, avec ou sans port)
  username: string;
  password: string;
  name?: string;
};

export type LinkPlaylistDto = LinkM3UDto | LinkXtreamDto;

@Injectable()
export class PlaylistsService {
  private readonly logger = new Logger(PlaylistsService.name);

  constructor(@InjectRepository(Playlist) private readonly repo: Repository<Playlist>) {}

  // ---------------------------------------------------------------------------
  // Lier une playlist
  // ---------------------------------------------------------------------------
  async linkPlaylist(userId: string, dto: LinkPlaylistDto): Promise<Playlist> {
    if (!userId) throw new Error('userId manquant');

    if (dto.type === 'm3u') {
      const rawUrl = (dto.m3u_url ?? dto.url ?? '').trim();
      if (!rawUrl) throw new Error('URL M3U manquante');
      const m3uUrl = this.normalizeM3UUrl(rawUrl);

      // Valide seulement la M3U (PAS de conversion Xtream)
      const { entries } = await this.validateM3UNotEmpty(m3uUrl);
      this.logger.log(`M3U validée (${entries} entrées)`);

      const entity = this.repo.create({
        user_id: userId,
        type: 'M3U',
        url: m3uUrl,
        name: (dto as any).name ?? 'M3U',
        active: true,
      } as Partial<Playlist>);
      await this.activateNew(userId, entity);
      return entity;
    }

    if (dto.type === 'xtream') {
      return await this.linkXtreamFlow(userId, dto);
    }

    throw new Error('Type de playlist inconnu');
  }

  // ---------------------------------------------------------------------------
  // XTREAM : découverte (player_api) + enregistrement (sans get.php)
  // ---------------------------------------------------------------------------
  private async linkXtreamFlow(userId: string, dto: LinkXtreamDto): Promise<Playlist> {
    if (!dto.base_url || !dto.username || !dto.password) {
      throw new Error('Paramètres Xtream manquants');
    }

    // Découvrir un endpoint player_api fonctionnel
    const details = await this.discoverXtreamDetails(dto.base_url, dto.username, dto.password);
    if (!details) {
      throw new Error(`Impossible de découvrir/valider le panel Xtream depuis "${dto.base_url}"`);
    }

    // Choisir un protocole public (sans port) pour l’UX
    const preferHttps = String(details.serverInfo?.server_protocol || '').toLowerCase() === 'https';
    const protocol = preferHttps ? 'https' : 'http';
    const publicBase = `${protocol}://${details.host}`;

    // Enregistrer: on stocke AUSSI base_url/username/password pour l’accès API/streams
    const entity = this.repo.create({
      user_id: userId,
      type: 'XTREAM',
      url: publicBase,                 // affichage (propre)
      base_url: details.chosenBase,    // endpoint avec port OK
      username: dto.username,
      password: dto.password,
      name: dto.name ?? `Xtream: ${details.host}`,
      active: true,
    } as Partial<Playlist>);
    await this.activateNew(userId, entity);
    return entity;
  }

  // ---------------------------------------------------------------------------
  // Validation M3U (TLS tolérant + fallback http)
  // ---------------------------------------------------------------------------
  private async validateM3UNotEmpty(url: string): Promise<{ entries: number }> {
    const doFetch = async (u: string) =>
      axios.get(u, {
        timeout: 12000,
        maxRedirects: 5,
        responseType: 'text',
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: '*/*' },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      });

    let res = await doFetch(url);

    // Fallback: si HTTPS casse, retenter en HTTP
    const bad = res.status >= 400 || !String(res.data ?? '').includes('#EXTM3U');
    if (bad && url.startsWith('https://')) {
      const httpUrl = url.replace(/^https:\/\//i, 'http://');
      this.logger.warn(`HTTPS KO sur ${url}. Tentative en clair: ${httpUrl}`);
      try { res = await doFetch(httpUrl); } catch {}
    }

    const body = String(res.data ?? '');
    if (!body.includes('#EXTM3U')) throw new Error(`Lecture M3U échouée (HTTP ${res.status})`);
    const entries = (body.match(/^#EXTINF/igm) || []).length;
    if (entries === 0) throw new Error('M3U vide');
    return { entries };
  }

  // ---------------------------------------------------------------------------
  // Découverte/Validation Xtream via player_api.php (ports auto)
  // ---------------------------------------------------------------------------
  private hostFromMaybeUrl(raw: string): string {
    const r = (raw || '').trim();
    try {
      const u = new URL(/^https?:\/\//i.test(r) ? r : `http://${r}`);
      return u.hostname;
    } catch {
      return r.replace(/^https?:\/\//i, '').split('/')[0].split('?')[0];
    }
  }

  private xtreamCandidateBasesForApi(hostOrUrl: string): string[] {
    const host = this.hostFromMaybeUrl(hostOrUrl);
    const bases = [
      `https://${host}`,
      `http://${host}`,
      `http://${host}:80`,
      `http://${host}:8080`,
      `http://${host}:8000`,
      `http://${host}:2052`,
      `http://${host}:2086`,
      `http://${host}:2095`,
      `http://${host}:2179`,
    ];
    return [...new Set(bases.map((b) => b.replace(/\/+$/, '')))];
  }

  private async fetchJson(url: string): Promise<any> {
    try {
      const res = await axios.get(url, {
        timeout: 8000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json, */*' },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      });
      if (res.status === 200) return res.data;
      return { __status: res.status, __data: res.data };
    } catch (e: any) {
      return { __error: e?.message || String(e) };
    }
  }

  private async discoverXtreamDetails(baseHostOrUrl: string, username: string, password: string): Promise<{
    host: string;
    chosenBase: string;
    serverInfo?: any;
    userInfo?: any;
  } | null> {
    const host = this.hostFromMaybeUrl(baseHostOrUrl);
    const candidates = this.xtreamCandidateBasesForApi(host);
    this.logger.log(`XTREAM discovery: host="${host}" candidates=${candidates.join(', ')}`);

    for (const base of candidates) {
      const url = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      const j = await this.fetchJson(url);
      if (j && typeof j === 'object' && j.user_info && j.server_info) {
        this.logger.log(`XTREAM discovery OK via ${base}`);
        return { host, chosenBase: base, serverInfo: j.server_info, userInfo: j.user_info };
      }
      if (j?.__error) this.logger.warn(`XTREAM discovery error on ${url}: ${j.__error}`);
      else if (j?.__status) this.logger.warn(`XTREAM discovery KO ${url} (HTTP ${j.__status})`);
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // XTREAM helpers + contenu VOD/SERIES (utilisés par VodService)
  // ---------------------------------------------------------------------------
  private async xtreamGet(base: string, params: Record<string, any>) {
    const u = new URL('/player_api.php', base);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v)));
    const res = await axios.get(u.toString(), {
      timeout: 20000,
      validateStatus: (s) => s >= 200 && s < 500,
      headers: { 'User-Agent': 'NovaStream/1.0', Accept: 'application/json' },
      maxRedirects: 2,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
    if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
    return res.data;
  }

  private ensureXtream(pl: any) {
    if (!(pl && pl.type === 'XTREAM' && pl.base_url && pl.username && pl.password)) {
      throw new BadRequestException('Playlist Xtream incomplète.');
    }
  }

  // -------- MOVIES --------
  async getAllMovies(userId: string) {
    const pl = await this.getActiveForUser(userId);
    if (!pl) return [];
    if (pl.type === 'XTREAM') {
      this.ensureXtream(pl as any);
      let items: any[] = [];
      try {
        const data = await this.xtreamGet((pl as any).base_url, { username: (pl as any).username, password: (pl as any).password, action: 'get_vod_streams' });
        if (Array.isArray(data)) items = data;
      } catch {}
      return items.map(x => ({
        id: String(x.stream_id ?? x.streamId ?? x.id ?? ''),
        title: String(x.name || ''),
        poster: x.stream_icon || null,
        backdrop: null,
        year: x.releaseDate ? Number(String(x.releaseDate).slice(0,4)) : null,
        overview: null,
        tmdb: x.tmdb ?? null,
      }));
    }
    return [];
  }

  async getMovieRails(userId: string) {
    const all = await this.getAllMovies(userId);
    const rails = [];
    if (all.length) {
      rails.push({ title: 'Films', items: all.slice(0, 50) });
      const withYear = all.filter(x => x.year);
      if (withYear.length) {
        const recent = [...withYear].sort((a,b)=>(b.year||0)-(a.year||0)).slice(0, 30);
        rails.push({ title: 'Récemment ajoutés', items: recent });
      }
    }
    return rails as { title:string; items:any[] }[];
  }

  async getMovieDetails(userId: string, movieId: string) {
    const pl = await this.getActiveForUser(userId);
    if (!pl) throw new NotFoundException('Aucune source.');
    if (pl.type !== 'XTREAM') throw new BadRequestException('Détails film non disponibles pour M3U.');
    this.ensureXtream(pl as any);
    const base = (pl as any).base_url;
    const u = await this.xtreamGet(base, { username: (pl as any).username, password: (pl as any).password, action: 'get_vod_info', vod_id: movieId });
    const info = u || {};
    const movie = (info.movie_data || {}) as any;
    return {
      id: movieId,
      title: movie.name || info.info?.name || '',
      overview: info.info?.plot || null,
      poster: movie.cover_big || movie.stream_icon || info.info?.cover || null,
      backdrop: info.info?.backdrop_path || null,
      year: info.info?.releasedate ? Number(String(info.info.releasedate).slice(0,4)) : null,
      duration: info.info?.duration || null,
      tmdb: info.info?.tmdb || null,
      raw: info,
    };
  }

  async getMovieStreamUrl(userId: string, movieId: string): Promise<string | null> {
    const pl = await this.getActiveForUser(userId);
    if (!pl) return null;
    if (pl.type !== 'XTREAM') return null;
    this.ensureXtream(pl as any);
    let ext = 'mp4';
    try {
      const inf = await this.xtreamGet((pl as any).base_url, { username: (pl as any).username, password: (pl as any).password, action: 'get_vod_info', vod_id: movieId });
      const info = inf || {};
      ext = info.info?.container_extension || info.movie_data?.container_extension || ext;
    } catch {}
    const base = (pl as any).base_url;
    return `${base.replace(/\/+$/,'')}/movie/${encodeURIComponent((pl as any).username!)}/${encodeURIComponent((pl as any).password!)}/${encodeURIComponent(movieId)}.${ext}`;
  }

  // -------- SERIES --------
  async getAllShows(userId: string) {
    const pl = await this.getActiveForUser(userId);
    if (!pl) return [];
    if (pl.type === 'XTREAM') {
      this.ensureXtream(pl as any);
      let items: any[] = [];
      try {
        const data = await this.xtreamGet((pl as any).base_url, { username: (pl as any).username, password: (pl as any).password, action: 'get_series' });
        if (Array.isArray(data)) items = data;
      } catch {}
      return items.map(x => ({
        id: String(x.series_id ?? x.seriesId ?? x.id ?? ''),
        title: String(x.name || ''),
        poster: (x.cover || x.cover_big) || null,
        backdrop: null,
        year: x.releaseDate ? Number(String(x.releaseDate).slice(0,4)) : null,
        overview: x.plot || null,
        tmdb: x.tmdb ?? null,
      }));
    }
    return [];
  }

  async getShowRails(userId: string) { return await this.getSeriesRails(userId); }
  async getSeriesRails(userId: string) {
    const all = await this.getAllShows(userId);
    const rails = [];
    if (all.length) {
      rails.push({ title: 'Séries', items: all.slice(0, 50) });
      const withYear = all.filter(x => x.year);
      if (withYear.length) {
        const recent = [...withYear].sort((a,b)=>(b.year||0)-(a.year||0)).slice(0, 30);
        rails.push({ title: 'Nouveautés', items: recent });
      }
    }
    return rails as { title:string; items:any[] }[];
  }

  async getSeriesDetails(userId: string, seriesId: string) { return await this.getShowDetails(userId, seriesId); }
  async getShowDetails(userId: string, seriesId: string) {
    const pl = await this.getActiveForUser(userId);
    if (!pl) throw new NotFoundException('Aucune source.');
    if (pl.type !== 'XTREAM') throw new BadRequestException('Détails série non disponibles pour M3U.');
    this.ensureXtream(pl as any);
    const data = await this.xtreamGet((pl as any).base_url, { username: (pl as any).username, password: (pl as any).password, action: 'get_series_info', series_id: seriesId });
    const info = data || {};
    return {
      id: seriesId,
      title: info.info?.name || '',
      overview: info.info?.plot || null,
      poster: info.info?.cover || info.info?.cover_big || null,
      backdrop: null,
      year: info.info?.releasedate ? Number(String(info.info.releasedate).slice(0,4)) : null,
      seasons: Object.values(info.episodes || {}).length || 0,
      raw: info,
    };
  }

  async getSeriesSeasons(userId: string, seriesId: string) {
    const pl = await this.getActiveForUser(userId);
    if (!pl) throw new NotFoundException('Aucune source.');
    if (pl.type !== 'XTREAM') throw new BadRequestException('Saisons non disponibles pour M3U.');
    this.ensureXtream(pl as any);
    const data = await this.xtreamGet((pl as any).base_url, { username: (pl as any).username, password: (pl as any).password, action: 'get_series_info', series_id: seriesId });
    const info = data || {};
    const episodes = info.episodes || {};
    const out: any[] = [];
    Object.keys(episodes).forEach(seasonNum => {
      const eps = Array.isArray(episodes[seasonNum]) ? episodes[seasonNum] : [];
      out.push({
        id: `${seriesId}-S${seasonNum}`,
        season: Number(seasonNum),
        episodes: eps.map((e: any) => ({
          id: String(e.id ?? e.episode_id ?? `${seriesId}-${seasonNum}-${e.episode_num}`),
          title: e.title || `Episode ${e.episode_num}`,
          episode: Number(e.episode_num || 0),
          overview: e.plot || null,
          poster: e.info?.movie_image || null,
          year: null,
        })),
      });
    });
    return out.sort((a,b)=>a.season-b.season);
  }

  async getEpisodeStreamUrl(userId: string, seriesId: string, episodeId: string): Promise<string | null> {
    const pl = await this.getActiveForUser(userId);
    if (!pl) return null;
    if (pl.type !== 'XTREAM') return null;
    this.ensureXtream(pl as any);
    let ext = 'mp4';
    try {
      const data = await this.xtreamGet((pl as any).base_url, { username: (pl as any).username, password: (pl as any).password, action: 'get_series_info', series_id: seriesId });
      const eps = data?.episodes || {};
      for (const key of Object.keys(eps)) {
        const arr = Array.isArray(eps[key]) ? eps[key] : [];
        const found = arr.find((e:any) => String(e.id ?? e.episode_id) === String(episodeId));
        if (found && found.container_extension) { ext = found.container_extension; break; }
      }
    } catch {}
    const base = (pl as any).base_url;
    return `${base.replace(/\/+$/,'')}/series/${encodeURIComponent((pl as any).username!)}/${encodeURIComponent((pl as any).password!)}/${encodeURIComponent(episodeId)}.${ext}`;
  }

  // ---------------------------------------------------------------------------
  // DB helpers + compat contrôleur
  // ---------------------------------------------------------------------------
  private async activateNew(userId: string, entity: Playlist): Promise<void> {
    await this.repo.update({ user_id: userId, active: true }, { active: false });
    await this.repo.save(entity);
  }

  async getActiveForUser(userId: string): Promise<Playlist | null> {
    return await this.repo.findOne({ where: { user_id: userId, active: true } });
  }

  private normalizeM3UUrl(raw: string): string {
    let u = (raw || '').trim();
    if (!u) throw new Error('URL M3U vide');
    if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
    return u;
  }

  private sanitizePublicBaseUrl(raw: string): string {
    let h = raw.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
    if (/^https:\/\//i.test(raw)) return `https://${h}`;
    return `http://${h}`;
  }

  // Compat contrôleur
  async getForUser(userId: string): Promise<Playlist[]> {
    return await this.repo.find({ where: { user_id: userId }, order: { created_at: 'DESC' } });
  }

  async link(userId: string, dto: LinkPlaylistDto): Promise<Playlist> {
    return await this.linkPlaylist(userId, dto);
  }

  async unlink(userId: string): Promise<void> {
    await this.repo.update({ user_id: userId, active: true }, { active: false });
  }
}
