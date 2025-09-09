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

function idFrom(str: string) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

function parseMaybeYear(val: any, name?: string): number | null {
  if (typeof val === 'number') return val || null;
  if (typeof val === 'string') {
    const n = Number(val);
    if (!isNaN(n) && n >= 1900 && n <= 2100) return n;
    const m = val.match(/\b(19|20)\d{2}\b/);
    if (m) return Number(m[0]);
  }
  if (name) {
    const m = name.match(/\b(19|20)\d{2}\b/);
    if (m) return Number(m[0]);
  }
  return null;
}

function parseMaybeTs(val: any): number | null {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = Number(val);
    if (!isNaN(n) && n > 0) return n;
    const d = Date.parse(val);
    if (!isNaN(d)) return Math.floor(d / 1000);
  }
  return null;
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

  // ---------- LISTES SIMPLES (déjà en place) ----------
  async movies(userId: string) {
    const plMaybe = await this.playlists.getActiveForUser(userId);
    this.assertPlaylist(plMaybe);
    const pl = plMaybe;

    if (pl.type === 'XTREAM') {
      if (!pl.base_url || !pl.username || !pl.password) {
        throw new BadRequestException('Playlist Xtream incomplète (base_url/username/password).');
      }

      let arr: any[] = [];
      try {
        const data = await this.xtreamGet(pl.base_url, {
          username: pl.username, password: pl.password, action: 'get_vod_streams',
        });
        if (Array.isArray(data)) arr = data;
      } catch (e) {
        log.warn(`get_vod_streams direct a échoué: ${String((e as any)?.message || e)}`);
      }

      if (arr.length === 0) {
        try {
          const cats = await this.xtreamGet(pl.base_url, {
            username: pl.username, password: pl.password, action: 'get_vod_categories',
          });
          if (Array.isArray(cats) && cats.length) {
            for (const c of cats.slice(0, 50)) {
              const cid = c.category_id ?? c.categoryID ?? c.categoryid;
              if (!cid) continue;
              const d = await this.xtreamGet(pl.base_url, {
                username: pl.username, password: pl.password, action: 'get_vod_streams', category_id: cid,
              });
              if (Array.isArray(d)) arr.push(...d);
              if (arr.length > 2000) break;
            }
          }
        } catch (e) {
          log.warn(`fallback catégories VOD a échoué: ${String((e as any)?.message || e)}`);
        }
      }

      return (arr || []).slice(0, 1000).map((x: any) => ({
        id: x.stream_id ?? x.streamId ?? x.id,
        title: x.name,
        poster: x.stream_icon || x.cover || null,
        year: parseMaybeYear(x.year, x.name),
        plot: x.plot || x.description || null,
        duration: x.duration || null,
        rating: x.rating || null,
        category_id: x.category_id || x.categoryid || null,
      }));
    }

    if (!pl.url) throw new BadRequestException('Playlist M3U sans URL.');
    const resp = await axios.get(pl.url, {
      timeout: 60000, responseType: 'text', maxContentLength: 200 * 1024 * 1024,
      decompress: true, validateStatus: (s) => s >= 200 && s < 400,
      headers: { 'User-Agent': 'NovaStream/1.0', Accept: '*/*' },
    });
    const items = parseM3U(resp.data || '');
    const { movies } = classifyM3U(items);
    return movies.slice(0, 1000).map((m) => ({
      id: idFrom(m.url), title: m.name, poster: m.logo || null,
      year: parseMaybeYear((m as any).year, m.name), plot: null, duration: null, rating: null,
      category_id: m.group || null,
    }));
  }

  async shows(userId: string) {
    const plMaybe = await this.playlists.getActiveForUser(userId);
    this.assertPlaylist(plMaybe);
    const pl = plMaybe;

    if (pl.type === 'XTREAM') {
      if (!pl.base_url || !pl.username || !pl.password) {
        throw new BadRequestException('Playlist Xtream incomplète (base_url/username/password).');
      }

      let arr: any[] = [];
      try {
        const data = await this.xtreamGet(pl.base_url, {
          username: pl.username, password: pl.password, action: 'get_series',
        });
        if (Array.isArray(data)) arr = data;
      } catch (e) {
        log.warn(`get_series direct a échoué: ${String((e as any)?.message || e)}`);
      }

      if (arr.length === 0) {
        try {
          const cats = await this.xtreamGet(pl.base_url, {
            username: pl.username, password: pl.password, action: 'get_series_categories',
          });
          if (Array.isArray(cats) && cats.length) {
            for (const c of cats.slice(0, 50)) {
              const cid = c.category_id ?? c.categoryID ?? c.categoryid;
              if (!cid) continue;
              const d = await this.xtreamGet(pl.base_url, {
                username: pl.username, password: pl.password, action: 'get_series', category_id: cid,
              });
              if (Array.isArray(d)) arr.push(...d);
              if (arr.length > 2000) break;
            }
          }
        } catch (e) {
          log.warn(`fallback catégories séries a échoué: ${String((e as any)?.message || e)}`);
        }
      }

      return (arr || []).slice(0, 1000).map((x: any) => ({
        id: x.series_id ?? x.seriesId ?? x.id,
        title: x.name,
        poster: x.cover || x.stream_icon || null,
        plot: x.plot || x.overview || null,
        rating: x.rating || null,
        category_id: x.category_id || x.categoryid || null,
        // pas toujours d'année fiable côté séries
      }));
    }

    if (!pl.url) throw new BadRequestException('Playlist M3U sans URL.');
    const resp = await axios.get(pl.url, {
      timeout: 60000, responseType: 'text', maxContentLength: 200 * 1024 * 1024,
      decompress: true, validateStatus: (s) => s >= 200 && s < 400,
      headers: { 'User-Agent': 'NovaStream/1.0', Accept: '*/*' },
    });
    const items = parseM3U(resp.data || '');
    const { shows } = classifyM3U(items);
    return shows.slice(0, 1000).map((s) => ({
      id: idFrom(s.url + 'series'),
      title: s.name, poster: s.logo || null, plot: null, rating: null,
      category_id: s.group || null,
    }));
  }

  // ---------- RAILS ----------
  private normalizeTitle(t?: string | null) {
    return (t || '').trim().replace(/\s+/g, ' ');
  }

  async moviesRails(userId: string) {
    const plMaybe = await this.playlists.getActiveForUser(userId);
    this.assertPlaylist(plMaybe);
    const pl = plMaybe;

    // XTREAM : on va chercher catégories + champs "added" & "year"
    if (pl.type === 'XTREAM') {
      const base = pl.base_url!, u = pl.username!, p = pl.password!;
      // catégories
      const catList = await this.xtreamGet(base, { username: u, password: p, action: 'get_vod_categories' }).catch(() => []);
      const catNameById = new Map<string, string>();
      if (Array.isArray(catList)) {
        for (const c of catList) {
          const id = String(c.category_id ?? c.categoryID ?? c.categoryid ?? '');
          if (id) catNameById.set(id, this.normalizeTitle(c.category_name || c.name || 'Catégorie'));
        }
      }
      // tous les films (direct + fallback cat si vide)
      let items: any[] = [];
      const direct = await this.xtreamGet(base, { username: u, password: p, action: 'get_vod_streams' }).catch(() => []);
      if (Array.isArray(direct)) items = direct;
      if (!items.length && catNameById.size) {
        for (const [cid] of Array.from(catNameById.entries()).slice(0, 80)) {
          const d = await this.xtreamGet(base, { username: u, password: p, action: 'get_vod_streams', category_id: cid }).catch(() => []);
          if (Array.isArray(d)) items.push(...d);
          if (items.length > 3000) break;
        }
      }

      const normalized = items.map((x) => {
        const year = parseMaybeYear(x.year, x.name);
        const added_ts = parseMaybeTs(x.added ?? x.last_modified ?? x.create_date);
        const catId = String(x.category_id ?? x.categoryid ?? '');
        return {
          id: x.stream_id ?? x.streamId ?? x.id,
          title: this.normalizeTitle(x.name),
          poster: x.stream_icon || x.cover || null,
          year, plot: x.plot || x.description || null,
          category_id: catId,
          category_name: catNameById.get(catId) || null,
          added_ts,
        };
      });

      // rails
      const rails: any[] = [];

      // Récemment ajoutés (si on a "added_ts")
      const withAdded = normalized.filter((n) => n.added_ts);
      if (withAdded.length) {
        withAdded.sort((a, b) => (b.added_ts! - a.added_ts!));
        rails.push({ key: 'recent', title: 'Récemment ajoutés', items: withAdded.slice(0, 24) });
      }

      // Films 2025 (si dispo), puis 2024, 2023…
      const currentYear = new Date().getFullYear();
      for (const yr of [currentYear, currentYear - 1, currentYear + 1, 2025, 2024, 2023]) {
        const yrItems = normalized.filter((n) => n.year === yr);
        if (yrItems.length >= 6) {
          rails.push({ key: `year-${yr}`, title: `Films ${yr}`, items: yrItems.slice(0, 24) });
        }
      }

      // Top catégories (par volume)
      const countByCat = new Map<string, number>();
      for (const n of normalized) if (n.category_name) countByCat.set(n.category_name, (countByCat.get(n.category_name) || 0) + 1);
      const topCats = Array.from(countByCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name);

      for (const name of topCats) {
        const catItems = normalized.filter((n) => n.category_name === name).slice(0, 24);
        if (catItems.length) rails.push({ key: `cat-${name}`, title: name, items: catItems });
      }

      return { rails };
    }

    // M3U : rails par groupes (group-title) + heuristique année + "Récents" (ordre du fichier)
    if (!pl.url) throw new BadRequestException('Playlist M3U sans URL.');
    const resp = await axios.get(pl.url, {
      timeout: 60000, responseType: 'text', maxContentLength: 200 * 1024 * 1024,
      decompress: true, validateStatus: (s) => s >= 200 && s < 400,
      headers: { 'User-Agent': 'NovaStream/1.0', Accept: '*/*' },
    });
    const items = parseM3U(resp.data || '');
    const { movies } = classifyM3U(items);

    const norm = movies.map((m) => {
      const year = parseMaybeYear((m as any).year, m.name);
      return {
        id: idFrom(m.url), title: this.normalizeTitle(m.name), poster: m.logo || null,
        year, group: m.group || null, url: m.url,
      };
    });

    const rails: any[] = [];

    // "Récemment ajoutés" ≈ début de fichier
    if (norm.length) rails.push({ key: 'recent', title: 'Récemment ajoutés', items: norm.slice(0, 24) });

    // Films 2025 / 2024 / 2023 / 2022
    for (const yr of [2025, 2024, 2023, 2022]) {
      const yrItems = norm.filter((n) => n.year === yr);
      if (yrItems.length >= 6) rails.push({ key: `year-${yr}`, title: `Films ${yr}`, items: yrItems.slice(0, 24) });
    }

    // Groupes les plus fournis
    const byGroup = new Map<string, any[]>();
    for (const n of norm) {
      if (!n.group) continue;
      const k = String(n.group);
      if (!byGroup.has(k)) byGroup.set(k, []);
      byGroup.get(k)!.push(n);
    }
    const topGroups = Array.from(byGroup.entries()).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
    for (const [g, arr] of topGroups) {
      rails.push({ key: `group-${g}`, title: g, items: arr.slice(0, 24) });
    }

    return { rails };
  }

  async showsRails(userId: string) {
    const plMaybe = await this.playlists.getActiveForUser(userId);
    this.assertPlaylist(plMaybe);
    const pl = plMaybe;

    if (pl.type === 'XTREAM') {
      const base = pl.base_url!, u = pl.username!, p = pl.password!;
      const catList = await this.xtreamGet(base, { username: u, password: p, action: 'get_series_categories' }).catch(() => []);
      const catNameById = new Map<string, string>();
      if (Array.isArray(catList)) {
        for (const c of catList) {
          const id = String(c.category_id ?? c.categoryID ?? c.categoryid ?? '');
          if (id) catNameById.set(id, this.normalizeTitle(c.category_name || c.name || 'Catégorie'));
        }
      }
      let items: any[] = [];
      const direct = await this.xtreamGet(base, { username: u, password: p, action: 'get_series' }).catch(() => []);
      if (Array.isArray(direct)) items = direct;
      if (!items.length && catNameById.size) {
        for (const [cid] of Array.from(catNameById.entries()).slice(0, 80)) {
          const d = await this.xtreamGet(base, { username: u, password: p, action: 'get_series', category_id: cid }).catch(() => []);
          if (Array.isArray(d)) items.push(...d);
          if (items.length > 3000) break;
        }
      }

      const normalized = items.map((x) => {
        const catId = String(x.category_id ?? x.categoryid ?? '');
        const added_ts = parseMaybeTs(x.added ?? x.last_modified ?? x.create_date);
        return {
          id: x.series_id ?? x.seriesId ?? x.id,
          title: this.normalizeTitle(x.name),
          poster: x.cover || x.stream_icon || null,
          plot: x.plot || x.overview || null,
          category_id: catId,
          category_name: catNameById.get(catId) || null,
          added_ts,
        };
      });

      const rails: any[] = [];
      const withAdded = normalized.filter((n) => n.added_ts);
      if (withAdded.length) {
        withAdded.sort((a, b) => (b.added_ts! - a.added_ts!));
        rails.push({ key: 'recent', title: 'Récemment ajoutées', items: withAdded.slice(0, 24) });
      }
      const countByCat = new Map<string, number>();
      for (const n of normalized) if (n.category_name) countByCat.set(n.category_name, (countByCat.get(n.category_name) || 0) + 1);
      const topCats = Array.from(countByCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name);
      for (const name of topCats) {
        const catItems = normalized.filter((n) => n.category_name === name).slice(0, 24);
        if (catItems.length) rails.push({ key: `cat-${name}`, title: name, items: catItems });
      }
      return { rails };
    }

    // M3U : regrouper par group-title
    if (!pl.url) throw new BadRequestException('Playlist M3U sans URL.');
    const resp = await axios.get(pl.url, {
      timeout: 60000, responseType: 'text', maxContentLength: 200 * 1024 * 1024,
      decompress: true, validateStatus: (s) => s >= 200 && s < 400,
      headers: { 'User-Agent': 'NovaStream/1.0', Accept: '*/*' },
    });
    const items = parseM3U(resp.data || '');
    const { shows } = classifyM3U(items);

    const norm = shows.map((s) => ({
      id: idFrom(s.url + 'series'), title: this.normalizeTitle(s.name), poster: s.logo || null, group: s.group || null, url: s.url,
    }));

    const rails: any[] = [];
    if (norm.length) rails.push({ key: 'recent', title: 'Récemment ajoutées', items: norm.slice(0, 24) });

    const byGroup = new Map<string, any[]>();
    for (const n of norm) { const g = n.group || ''; if (!g) continue; if (!byGroup.has(g)) byGroup.set(g, []); byGroup.get(g)!.push(n); }
    const topGroups = Array.from(byGroup.entries()).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
    for (const [g, arr] of topGroups) rails.push({ key: `group-${g}`, title: g, items: arr.slice(0, 24) });

    return { rails };
  }
}
