import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PlaylistsService } from '../playlists/playlists.service';
import axios from 'axios';
import { classifyM3U, parseM3U } from '../../utils/m3u';
import { Playlist } from '../playlists/playlist.entity';

const log = new Logger('LiveService');

@Injectable()
export class LiveService {
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

  async channels(userId: string) {
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
          username: pl.username, password: pl.password, action: 'get_live_streams',
        });
        if (Array.isArray(data)) arr = data;
      } catch (e) {
        log.warn(`get_live_streams direct a échoué: ${String((e as any)?.message || e)}`);
      }

      if (arr.length === 0) {
        try {
          const cats = await this.xtreamGet(pl.base_url, {
            username: pl.username, password: pl.password, action: 'get_live_categories',
          });
          if (Array.isArray(cats) && cats.length) {
            for (const c of cats.slice(0, 80)) {
              const cid = c.category_id ?? c.categoryID ?? c.categoryid;
              if (!cid) continue;
              const d = await this.xtreamGet(pl.base_url, {
                username: pl.username, password: pl.password, action: 'get_live_streams', category_id: cid,
              });
              if (Array.isArray(d)) arr.push(...d);
              if (arr.length > 3000) break;
            }
          }
        } catch (e) {
          log.warn(`fallback catégories live a échoué: ${String((e as any)?.message || e)}`);
        }
      }

      return (arr || []).slice(0, 1200).map((x: any) => ({
        id: x.stream_id ?? x.id,
        name: x.name,
        logo: x.stream_icon || null,
        category_id: x.category_id || x.categoryid || null,
        stream_type: x.stream_type || 'live',
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
    const { live } = classifyM3U(items);
    return live.slice(0, 1200).map((c, i) => ({
      id: c.tvgId || c.url || `m3u-live-${i}`,
      name: c.name,
      logo: c.logo || null,
      group: c.group || null,
      url: c.url,
    }));
  }
}
