import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PlaylistsService } from '../playlists/playlists.service';
import axios from 'axios';
import { classifyM3U, parseM3U } from '../../utils/m3u';

const log = new Logger('LiveService');

type ActivePlaylist = {
  type: 'M3U' | 'XTREAM';
  url?: string | null;
  base_url?: string | null;
  username?: string | null;
  password?: string | null;
};

type Channel = { id: string | number; name: string; logo?: string | null; group?: string | null; category_id?: any; added?: number | null; url?: string | null };
type Section<T> = { key: string; title: string; items: T[] };

@Injectable()
export class LiveService {
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

  async channels(userId: string): Promise<Channel[]> {
    const plMaybe = await this.playlists.getActiveForUser(userId);
    this.assertPlaylist(plMaybe);
    const pl = plMaybe;

    if (pl.type === 'XTREAM') {
      if (!pl.base_url || !pl.username || !pl.password)
        throw new BadRequestException('Playlist Xtream incomplète.');

      let arr: any[] = [];
      try {
        const data = await this.xtreamGet(pl.base_url, { username: pl.username, password: pl.password, action: 'get_live_streams' });
        if (Array.isArray(data)) arr = data;
      } catch (e) {
        log.warn(`get_live_streams direct: ${String((e as any)?.message || e)}`);
      }
      if (arr.length === 0) {
        try {
          const cats = await this.xtreamGet(pl.base_url, { username: pl.username, password: pl.password, action: 'get_live_categories' });
          if (Array.isArray(cats) && cats.length) {
            for (const c of cats.slice(0, 80)) {
              const cid = c.category_id ?? c.categoryID ?? c.categoryid;
              if (!cid) continue;
              const d = await this.xtreamGet(pl.base_url, { username: pl.username, password: pl.password, action: 'get_live_streams', category_id: cid });
              if (Array.isArray(d)) arr.push(...d);
              if (arr.length > 3000) break;
            }
          }
        } catch (e) {
          log.warn(`fallback live cats: ${String((e as any)?.message || e)}`);
        }
      }

      return (arr || []).slice(0, 3000).map((x: any) => ({
        id: x.stream_id ?? x.id,
        name: x.name,
        logo: x.stream_icon || null,
        category_id: x.category_id || x.categoryid || null,
        added: x.added ? Number(x.added) : null,
        url: null,
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
    return live.slice(0, 3000).map((c, i) => ({
      id: c.tvgId || c.url || `m3u-live-${i}`,
      name: c.name,
      logo: c.logo || null,
      group: c.group || null,
      url: c.url,
    }));
  }

  async channelSections(userId: string): Promise<Section<Channel>[]> {
    const pl = await this.playlists.getActiveForUser(userId);
    this.assertPlaylist(pl);
    const channels = await this.channels(userId);

    const sections: Section<Channel>[] = [];

    // Récents (si timestamp dispos)
    const recent = channels
      .filter(c => typeof c.added === 'number')
      .sort((a, b) => (b.added! - a.added!))
      .slice(0, 30);
    if (recent.length) sections.push({ key: 'recent', title: 'Récemment ajoutées', items: recent });

    // Bouquets / catégories
    let catsMap: Record<string, string> = {};
    if (pl.type === 'XTREAM' && pl.base_url && pl.username && pl.password) {
      try {
        const cats = await this.xtreamGet(pl.base_url, {
          username: pl.username, password: pl.password, action: 'get_live_categories',
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

    const buckets = new Map<string, Channel[]>();
    const deriveFromName = (t?: string | null): string | null => {
      if (!t) return null;
      const mBracket = t.match(/^\s*\[([^\]]+)\]/);
      if (mBracket) return mBracket[1].trim();
      const parts = t.split(/[-|•–—]/);
      if (parts.length >= 2 && parts[0].trim().length >= 3) return parts[0].trim().slice(0, 40);
      return null;
    };

    for (const c of channels) {
      let key: string | null =
        (c as any).group && String((c as any).group) ||
        (c as any).category_id != null ? String((c as any).category_id) : null;

      if (!key) key = deriveFromName(c.name);
      if (!key || key.toLowerCase() === 'null') key = 'Autres';

      const display = catsMap[key] || key;
      if (!buckets.has(display)) buckets.set(display, []);
      buckets.get(display)!.push(c);
    }

    const top = [...buckets.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 8);
    for (const [name, arr] of top) {
      sections.push({ key: `grp:${name}`, title: name, items: arr.slice(0, 24) });
    }

    return sections;
  }
}
