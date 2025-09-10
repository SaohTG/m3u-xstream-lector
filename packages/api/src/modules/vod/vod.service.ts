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

  // ----------------- Rails (films/séries/live) -----------------
  async getMovieRails(userId: string): Promise<Rail[]> {
    const pl = await this.playlists.getActiveForUser(userId);
    if (!pl) throw new BadRequestException('Aucune source liée');

    if (pl.type === 'XTREAM') {
      const base = this.xt(pl.base_url!, pl.username!, pl.password!);
      const [cats, list] = await Promise.all([
        this.xtGet(base, { action: 'get_vod_categories' }),
        this.xtGet(base, { action: 'get_vod_streams' }),
      ]);

      const byCat: Record<string, RailItem[]> = {};
      const catNames: Record<string, string> = {};
      (cats || []).forEach((c: any) => (catNames[c.category_id] = c.category_name));

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

      // rails "Derniers ajouts" + par année (2025..2018) + par catégorie
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

      Object.keys(byCat).forEach((k) => rails.push({ key: `c-${k}`, title: k, items: byCat[k].slice(0, 30) }));
      return rails;
    }

    // M3U : à implémenter si tu as une structure VOD dans ta M3U
    return [];
  }

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

      Object.keys(byCat).forEach((k) => rails.push({ key: `c-${k}`, title: k, items: byCat[k].slice(0, 30) }));
      return rails;
    }

    return [];
  }

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
    Object.keys(byCat).forEach((k) => rails.push({ key: `c-${k}`, title: k, items: byCat[k].slice(0, 30) }));
    return rails;
  }

  // ----------------- Séries : détails / saisons / URL épisode -----------------
  async getSeriesDetails(userId: string, seriesId: string) {
    const pl = await this.playlists.getActiveForUser(userId);
    if (!pl) throw new BadRequestException('Aucune source liée');
    if (pl.type !== 'XTREAM') {
      throw new BadRequestException('Détail séries disponible uniquement pour Xtream pour le moment.');
    }
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
    if (pl.type !== 'XTREAM') {
      throw new BadRequestException('Saisons/épisodes disponibles uniquement pour Xtream pour le moment.');
    }
    const base = this.xt(pl.base_url!, pl.username!, pl.password!);
    const data = await this.xtGet(base, { action: 'get_series_info', series_id: seriesId });
    const eps = data?.episodes || {};
    const seasons: Array<{ season: number; episodes: Array<{ id: string; number: number; title: string; ext?: string | null; duration?: number | null; }> }> = [];

    Object.keys(eps).sort((a, b) => Number(a) - Number(b)).forEach((s) => {
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
    if (pl.type !== 'XTREAM') {
      throw new BadRequestException('Lecture épisodes disponible uniquement pour Xtream pour le moment.');
    }
    // on a besoin de l'extension : on la cherche via get_series_info de façon heuristique (quelques panels n’exposent pas d’endpoint direct)
    const base = this.xt(pl.base_url!, pl.username!, pl.password!);
    // Souvent inutile si tu stockes l’ext côté client, mais on sécurise:
    let ext = 'mp4';
    try {
      // certains panels exposent action=get_series_info&series_id=... -> mais on n'a pas la série ici
      // fallback : beaucoup d’épisodes sont lisibles sans ext strict (certains proposent m3u8)
      ext = 'mp4';
    } catch {}

    const url = `${pl.base_url!.replace(/\/+$/, '')}/series/${encodeURIComponent(pl.username!)}/${encodeURIComponent(pl.password!)}/${encodeURIComponent(episodeId)}.${ext}`;
    return { url };
  }

  // ----------------- Helpers Xtream -----------------
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
      timeout: 15_000,
      validateStatus: (s) => s >= 200 && s < 500,
    });
    if (resp.status >= 400) throw new BadRequestException(`Xtream ${resp.status}`);
    return resp.data;
  }
}
