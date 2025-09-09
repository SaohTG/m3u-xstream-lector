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

  async channels(userId: string) {
    const plMaybe = await this.playlists.getActiveForUser(userId);
    this.assertPlaylist(plMaybe);
    const pl = plMaybe;

    if (pl.type === 'XTREAM') {
      const base = pl.base_url!, u = pl.username!, p = pl.password!;
      let arr: any[] = [];
      try {
        const data = await this.xtreamGet(base, { username: u, password: p, action: 'get_live_streams' });
        if (Array.isArray(data)) arr = data;
      } catch (e) { log.warn(`get_live_streams direct a échoué: ${String((e as any)?.message || e)}`); }

      if (!arr.length) {
        const cats = await this.xtreamGet(base, { username: u, password: p, action: 'get_live_categories' }).catch(() => []);
        if (Array.isArray(cats) && cats.length) {
          for (const c of cats.slice(0, 80)) {
            const cid = c.category_id ?? c.categoryID ?? c.categoryid;
            if (!cid) continue;
            const d = await this.xtreamGet(base, { username: u, password: p, action: 'get_live_streams', category_id: cid }).catch(() => []);
            if (Array.isArray(d)) arr.push(...d);
            if (arr.length > 3000) break;
          }
        }
      }

      return arr.slice(0, 1200).map((x: any) => ({
        id: x.stream_id ?? x.id, name: x.name, logo: x.stream_icon || null,
        category_id: x.category_id || x.categoryid || null, stream_type: x.stream_type || 'live',
      }));
    }

    if (!pl.url) throw new BadRequestException('Playlist M3U sans URL.');
    const resp = await axios.get(pl.url, {
      timeout: 60000, responseType: 'text', maxContentLength: 200 * 1024 * 1024,
      decompress: true, validateStatus: (s) => s >= 200 && s < 400,
      headers: { 'User-Agent': 'NovaStream/1.0', Accept: '*/*' },
    });
    const items = parseM3U(resp.data || '');
    const { live } = classifyM3U(items);
    return live.slice(0, 1200).map((c, i) => ({
      id: c.tvgId || c.url || `m3u-live-${i}`, name: c.name, logo: c.logo || null, group: c.group || null, url: c.url,
    }));
  }

  async rails(userId: string) {
    const plMaybe = await this.playlists.getActiveForUser(userId);
    this.assertPlaylist(plMaybe);
    const pl = plMaybe;

    if (pl.type === 'XTREAM') {
      const base = pl.base_url!, u = pl.username!, p = pl.password!;
      const cats = await this.xtreamGet(base, { username: u, password: p, action: 'get_live_categories' }).catch(() => []);
      const nameById = new Map<string, string>();
      if (Array.isArray(cats)) for (const c of cats) {
        const id = String(c.category_id ?? c.categoryID ?? c.categoryid ?? '');
        if (id) nameById.set(id, (c.category_name || c.name || 'Catégorie').trim());
      }

      let items: any[] = [];
      const direct = await this.xtreamGet(base, { username: u, password: p, action: 'get_live_streams' }).catch(() => []);
      if (Array.isArray(direct)) items = direct;
      if (!items.length && nameById.size) {
        for (const [cid] of Array.from(nameById.entries()).slice(0, 100)) {
          const d = await this.xtreamGet(base, { username: u, password: p, action: 'get_live_streams', category_id: cid }).catch(() => []);
          if (Array.isArray(d)) items.push(...d);
          if (items.length > 3000) break;
        }
      }

      const byCat = new Map<string, any[]>();
      for (const x of items) {
        const id = String(x.category_id ?? x.categoryid ?? '');
        const name = nameById.get(id) || 'Chaînes';
        if (!byCat.has(name)) byCat.set(name, []);
        byCat.get(name)!.push({
          id: x.stream_id ?? x.id, name: x.name, logo: x.stream_icon || null,
        });
      }

      // top 8 catégories
      const best = Array.from(byCat.entries()).sort((a,b)=>b[1].length-a[1].length).slice(0,8);
      return { rails: best.map(([title, arr]) => ({ key: `cat-${title}`, title, items: arr.slice(0,24) })) };
    }

    // M3U : rails = groupes (group-title)
    if (!pl.url) throw new BadRequestException('Playlist M3U sans URL.');
    const resp = await axios.get(pl.url, {
      timeout: 60000, responseType: 'text', maxContentLength: 200 * 1024 * 1024,
      decompress: true, validateStatus: (s) => s >= 200 && s < 400,
      headers: { 'User-Agent': 'NovaStream/1.0', Accept: '*/*' },
    });
    const items = parseM3U(resp.data || '');
    const { live } = classifyM3U(items);

    const byGroup = new Map<string, any[]>();
    for (const c of live) {
      const g = c.group || 'Chaînes';
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push({ id: c.tvgId || c.url, name: c.name, logo: c.logo || null });
    }
    const best = Array.from(byGroup.entries()).sort((a,b)=>b[1].length-a[1].length).slice(0,8);
    return { rails: best.map(([title, arr]) => ({ key: `group-${title}`, title, items: arr.slice(0,24) })) };
  }
}
