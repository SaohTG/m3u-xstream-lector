import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PlaylistsService } from '../playlists/playlists.service';
import axios from 'axios';
import { classifyM3U, parseM3U } from '../../utils/m3u';
import * as crypto from 'crypto';
import { Playlist } from '../playlists/playlist.entity';

const log = new Logger('VodService');

function idFrom(str: string) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

@Injectable()
export class VodService {
  constructor(private playlists: PlaylistsService) {}

  private assertPlaylist(pl: Playlist | null): asserts pl is Playlist {
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
        year: x.year || null,
        plot: x.plot || x.description || null,
        duration: x.duration || null,
        rating: x.rating || null,
        category_id: x.category_id || x.categoryid || null,
      }));
    }

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
    return movies.slice(0, 1000).map((m) => ({
      id: idFrom(m.url),
      title: m.name,
      poster: m.logo || null,
      year: null,
      plot: null,
      duration: null,
      rating: null,
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
      }));
    }

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
    return shows.slice(0, 1000).map((s) => ({
      id: idFrom(s.url + 'series'),
      title: s.name,
      poster: s.logo || null,
      plot: null,
      rating: null,
      category_id: s.group || null,
    }));
  }
}
