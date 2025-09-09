import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PlaylistsService } from '../playlists/playlists.service';
import axios from 'axios';
import { classifyM3U, parseM3U } from '../../utils/m3u';
import * as crypto from 'crypto';

const log = new Logger('VodService');

type ActivePlaylist = {
  type: 'M3U' | 'XTREAM';
  url?: string | null;
  base_url?: string | null;
  username?: string | null;
  password?: string | null;
};

type Movie = {
  id: string | number;
  title: string;
  poster?: string | null;
  year?: number | null;
  plot?: string | null;
  duration?: any;
  rating?: any;
  category_id?: any;
  added?: number | null; // Xtream
  group?: string | null; // M3U
};

type Show = {
  id: string | number;
  title: string;
  poster?: string | null;
  plot?: string | null;
  rating?: any;
  category_id?: any;
  added?: number | null;
  group?: string | null;
};

type Section<T> = { key: string; title: string; items: T[] };

function idFrom(str: string) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

@Injectable()
export class VodService {
  constructor(private playlists: PlaylistsService) {}

  private assertPlaylist(pl: ActivePlaylist | null): asserts pl is ActivePlaylist {
    if (!pl) throw new BadRequestException('Aucune source liée.');
  }

  private async xtreamGet(base: string, params: Record<string, any>) {
    const u = new URL('/player_api.php', base);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v)));
    const res = await axios.get(u.toString(), {
      timeout: 20000,
      validateStatus: (s) => s >= 200 && s < 500,
      headers: { 'User-Agent': 'NovaStream/1.0', Accept: 'application/json' },
      maxRedirects: 2,
    });
    return res.data;
  }

  // ---------- Helpers ----------
  private yearFromTitle(title?: string | null): number | null {
    if (!title) return null;
    const m = title.match(/\b(19|20)\d{2}\b/);
    return m ? Number(m[0]) : null;
  }

  private topYears<T extends { title?: string; year?: number | null }>(items: T[], max = 3) {
    const counts = new Map<number, number>();
    for (const it of items) {
      const y = (it.year as number) ?? this.yearFromTitle(it.title || '');
      if (!y) continue;
      counts.set(y, (counts.get(y) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[0] - a[0]).slice(0, max).map(([y]) => y);
  }

  private byGroup<T extends { group?: string | null; category_id?: any }>(
    items: T[],
    categoriesMap?: Record<string, string>,
    max = 6,
  ) {
    const map = new Map<string, T[]>();
    for (const it of items) {
      const key =
        (it as any).group ||
        (it as any).category_id?.toString?.() ||
        'Autres';
      const name = categoriesMap?.[key] || key || 'Autres';
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(it);
    }
    return [...map.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, max)
      .map(([title, arr]) => ({ key: `grp:${title}`, title, items: arr.slice(0, 24) as T[] }));
  }

  // ----- Enrichissement VOD (Xtream: get_vod_info) -----
  private async getVodInfo(base: string, username: string, password: string, vodId: string | number) {
    const data = await this.xtreamGet(base, {
      username, password, action: 'get_vod_info', vod_id: vodId,
    });
    // Les panels varient: info, movie_data, movie_info...
    const info = data?.info || data?.movie_data || data?.movie_info || {};
    return {
      poster: info.movie_image || info.cover || info.backdrop_path || null,
      plot: info.plot || info.description || info.overview || null,
      rating: info.rating || info.vote_average || null,
      duration: info.duration || info.runtime || null,
      year:
        (info.releasedate && Number(String(info.releasedate).slice(0, 4))) ||
        (info.year && Number(info.year)) ||
        null,
      title: info.name || info.title || null,
    };
  }

  private async enrichMoviesXtream(
    base: string,
    username: string,
    password: string,
    items: Movie[],
    maxItems = 120,
    concurrency = 8,
  ): Promise<Record<string | number, Partial<Movie>>> {
    const ids = Array.from(
      new Set(items.map(m => m.id).filter(Boolean))
    ).slice(0, maxItems);

    const results: Record<string | number, Partial<Movie>> = {};
    let idx = 0;

    const worker = async () => {
      while (idx < ids.length) {
        const my = idx++;
        const id = ids[my]!;
        try {
          const inf = await this.getVodInfo(base, username, password, id);
          results[id] = {
            poster: inf.poster ?? undefined,
            plot: inf.plot ?? undefined,
            rating: inf.rating ?? undefined,
            duration: inf.duration ?? undefined,
            year: inf.year ?? undefined,
            title: inf.title ?? undefined,
          };
        } catch (e) {
          // on continue
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, ids.length) }, () => worker());
    await Promise.all(workers);
    return results;
  }

  // ---------- Public lists ----------
  async movies(userId: string): Promise<Movie[]> {
    const plMaybe = await this.playlists.getActiveForUser(userId);
    this.assertPlaylist(plMaybe);
    const pl = plMaybe;

    if (pl.type === 'XTREAM') {
      if (!pl.base_url || !pl.username || !pl.password) {
        throw new BadRequestException('Playlist Xtream incomplète (base_url/username/password).');
      }
      let arr: any[] = [];
      try {
        const data = await this.xtreamGet(pl.base_url, { username: pl.username, password: pl.password, action: 'get_vod_streams' });
        if (Array.isArray(data)) arr = data;
      } catch (e) {
        log.warn(`get_vod_streams direct: ${String((e as any)?.message || e)}`);
      }
      if (arr.length === 0) {
        try {
          const cats = await this.xtreamGet(pl.base_url, { username: pl.username, password: pl.password, action: 'get_vod_categories' });
          if (Array.isArray(cats) && cats.length) {
            for (const c of cats.slice(0, 50)) {
              const cid = c.category_id ?? c.categoryID ?? c.categoryid;
              if (!cid) continue;
              const d = await this.xtreamGet(pl.base_url, { username: pl.username, password: pl.password, action: 'get_vod_streams', category_id: cid });
              if (Array.isArray(d)) arr.push(...d);
              if (arr.length > 2000) break;
            }
          }
        } catch (e) {
          log.warn(`fallback cats vod: ${String((e as any)?.message || e)}`);
        }
      }
      return (arr || []).slice(0, 2000).map((x: any) => ({
        id: x.stream_id ?? x.streamId ?? x.id,
        title: x.name,
        poster: x.stream_icon || x.cover || null,
        year: x.year || null,
        plot: x.plot || x.description || null,
        duration: x.duration || null,
        rating: x.rating || null,
        category_id: x.category_id || x.categoryid || null,
        added: x.added ? Number(x.added) : null,
      }));
    }

    // M3U
    if (!pl.url) throw new BadRequestException('Playlist M3U sans URL.');
    const resp = await axios.get(pl.url, {
      timeout: 60000,
      responseType: 'text',
      maxContentLength: 200 * 1024 * 1024,
      decompress: true,
      validateStatus: (s) => s >= 200 && s < 400,
      headers: { 'User-Agent': 'NovaStream/1.0', Accept: '*/*' },
    });
    const items = parseM3U(resp.data || '');
    const { movies } = classifyM3U(items);
    return movies.slice(0, 2000).map((m) => ({
      id: idFrom(m.url),
      title: m.name,
      poster: m.logo || null,
      year: this.yearFromTitle(m.name),
      plot: null,
      duration: null,
      rating: null,
      group: m.group || null,
    }));
  }

  async shows(userId: string): Promise<Show[]> {
    const plMaybe = await this.playlists.getActiveForUser(userId);
    this.assertPlaylist(plMaybe);
    const pl = plMaybe;

    if (pl.type === 'XTREAM') {
      if (!pl.base_url || !pl.username || !pl.password) {
        throw new BadRequestException('Playlist Xtream incomplète (base_url/username/password).');
      }
      let arr: any[] = [];
      try {
        const data = await this.xtreamGet(pl.base_url, { username: pl.username, password: pl.password, action: 'get_series' });
        if (Array.isArray(data)) arr = data;
      } catch (e) {
        log.warn(`get_series direct: ${String((e as any)?.message || e)}`);
      }
      if (arr.length === 0) {
        try {
          const cats = await this.xtreamGet(pl.base_url, { username: pl.username, password: pl.password, action: 'get_series_categories' });
          if (Array.isArray(cats) && cats.length) {
            for (const c of cats.slice(0, 50)) {
              const cid = c.category_id ?? c.categoryID ?? c.categoryid;
              if (!cid) continue;
              const d = await this.xtreamGet(pl.base_url, { username: pl.username, password: pl.password, action: 'get_series', category_id: cid });
              if (Array.isArray(d)) arr.push(...d);
              if (arr.length > 2000) break;
            }
          }
        } catch (e) {
          log.warn(`fallback cats series: ${String((e as any)?.message || e)}`);
        }
      }
      return (arr || []).slice(0, 2000).map((x: any) => ({
        id: x.series_id ?? x.seriesId ?? x.id,
        title: x.name,
        poster: x.cover || x.stream_icon || null,
        plot: x.plot || x.overview || null,
        rating: x.rating || null,
        category_id: x.category_id || x.categoryid || null,
        added: x.added ? Number(x.added) : null,
      }));
    }

    // M3U
    if (!pl.url) throw new BadRequestException('Playlist M3U sans URL.');
    const resp = await axios.get(pl.url, {
      timeout: 60000,
      responseType: 'text',
      maxContentLength: 200 * 1024 * 1024,
      decompress: true,
      validateStatus: (s) => s >= 200 && s < 400,
      headers: { 'User-Agent': 'NovaStream/1.0', Accept: '*/*' },
    });
    const items = parseM3U(resp.data || '');
    const { shows } = classifyM3U(items);
    return shows.slice(0, 2000).map((s) => ({
      id: idFrom(s.url + 'series'),
      title: s.name,
      poster: s.logo || null,
      plot: null,
      rating: null,
      group: s.group || null,
    }));
  }

  // ---------- SECTIONS / RAILS ----------
  async movieSections(userId: string): Promise<Section<Movie>[]> {
    const pl = await this.playlists.getActiveForUser(userId);
    this.assertPlaylist(pl);
    const movies = await this.movies(userId);

    const out: Section<Movie>[] = [];

    // Sections de base
    if (pl.type === 'XTREAM') {
      // Récemment ajoutés
      const recent = movies.filter(m => typeof m.added === 'number')
        .sort((a, b) => (b.added! - a.added!)).slice(0, 30);
      if (recent.length) out.push({ key: 'recent', title: 'Récemment ajoutés', items: recent });

      // Catégories
      let catsMap: Record<string, string> = {};
      try {
        const cats = await this.xtreamGet(pl.base_url!, { username: pl.username!, password: pl.password!, action: 'get_vod_categories' });
        if (Array.isArray(cats)) {
          catsMap = Object.fromEntries(
            cats.map((c: any) => [String(c.category_id ?? c.categoryID ?? c.categoryid), String(c.category_name ?? c.categoryName ?? c.name ?? 'Autres')])
          );
        }
      } catch {}
      out.push(...this.byGroup(movies, catsMap, 8));
    } else {
      // M3U
      if (movies.length) out.push({ key: 'recent', title: 'Récemment ajoutés', items: movies.slice(0, 30) });
      out.push(...this.byGroup(movies, undefined, 8));
    }

    // Années
    const years = this.topYears(movies, 3);
    for (const y of years) {
      const arr = movies.filter(m => (m.year ?? this.yearFromTitle(m.title)) === y).slice(0, 24);
      if (arr.length) out.push({ key: `year:${y}`, title: `Films ${y}`, items: arr });
    }

    // ----- ENRICHISSEMENT ciblé pour Xtream (get_vod_info) -----
    if (pl.type === 'XTREAM' && pl.base_url && pl.username && pl.password) {
      // On enrichit uniquement les films présents dans les rails (limite globale 120)
      const allItems = out.flatMap(s => s.items);
      const details = await this.enrichMoviesXtream(pl.base_url, pl.username, pl.password, allItems, 120, 8);

      // Patch des items
      for (const sec of out) {
        sec.items = sec.items.map(m => {
          const d = details[m.id];
          if (!d) return m;
          return {
            ...m,
            title: d.title ?? m.title,
            poster: d.poster ?? m.poster,
            plot: d.plot ?? m.plot,
            rating: d.rating ?? m.rating,
            duration: d.duration ?? m.duration,
            year: d.year ?? m.year,
          };
        });
      }
    }

    return out;
  }

  async showSections(userId: string): Promise<Section<Show>[]> {
    const pl = await this.playlists.getActiveForUser(userId);
    this.assertPlaylist(pl);
    const shows = await this.shows(userId);

    const out: Section<Show>[] = [];

    // Récents
    const recent = shows
      .filter(s => typeof s.added === 'number')
      .sort((a, b) => (b.added! - a.added!))
      .slice(0, 30);
    if (recent.length) out.push({ key: 'recent', title: 'Récemment ajoutées', items: recent });

    // Mapping catégories Xtream
    let catsMap: Record<string, string> = {};
    const mapXtream =
      pl.type === 'XTREAM' && pl.base_url && pl.username && pl.password;
    if (mapXtream) {
      try {
        const cats = await this.xtreamGet(pl.base_url!, {
          username: pl.username!, password: pl.password!, action: 'get_series_categories',
        });
        if (Array.isArray(cats)) {
          catsMap = Object.fromEntries(
            cats.map((c: any) => [
              String(c.category_id ?? c.categoryID ?? c.categoryid),
              String(c.category_name ?? c.categoryName ?? c.name ?? 'Autres'),
            ]),
          );
        }
      } catch {}
    }

    // Regroupement robuste
    const buckets = new Map<string, Show[]>();
    const deriveFromTitle = (t?: string | null): string | null => {
      if (!t) return null;
      const mBracket = t.match(/^\s*\[([^\]]+)\]/); // [Drama] Title
      if (mBracket) return mBracket[1].trim();
      const parts = t.split(/[-|•–—]/);
      if (parts.length >= 2 && parts[0].trim().length >= 3) return parts[0].trim().slice(0, 40);
      return null;
    };

    for (const s of shows) {
      let key: string | null =
        (s as any).group && String((s as any).group) ||
        (s as any).category_id != null ? String((s as any).category_id) : null;

      if (!key) key = deriveFromTitle(s.title);
      if (!key || key.toLowerCase() === 'null') key = 'Autres';

      const display = catsMap[key] || key;
      if (!buckets.has(display)) buckets.set(display, []);
      buckets.get(display)!.push(s);
    }

    const sorted = [...buckets.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8);

    for (const [name, arr] of sorted) {
      out.push({ key: `grp:${name}`, title: name, items: arr.slice(0, 24) });
    }

    return out;
  }
}
