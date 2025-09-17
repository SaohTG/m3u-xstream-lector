import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Playlist } from '../playlists/playlist.entity';
import { http } from '../../common/http';
import { parseM3U } from '@novastream/shared/dist/m3u-parser.js';
import { inferType } from '@novastream/shared/dist/classify.js';

@Injectable()
export class LiveService {
  private readonly logger = new Logger(LiveService.name);
  constructor(@InjectRepository(Playlist) private repo: Repository<Playlist>) {}

  async channels() {
    const p = await this.repo.findOne({ where: { user_id: 'demo-user', active: true } });
    if (!p) return [];
    if (p.type === 'M3U' && p.m3u_url) {
      const res = await http.get(p.m3u_url, { responseType: 'text' });
      const entries = parseM3U(res.data);
      return entries
        .filter((e) => inferType(e) === 'live')
        .map((e, idx) => ({
          id: `${idx}`,
          title: e.title,
          logo: e.attributes['tvg-logo'] ?? null,
          group: e.attributes['group-title'] ?? null,
          url: e.url
        }));
    }
    if (p.type === 'XTREAM' && p.base_url && p.username && p.password) {
      const base = p.base_url;
      const auth = `username=${encodeURIComponent(p.username)}&password=${encodeURIComponent(p.password)}`;
      // categories
      const cats = await http.get(`${base}?action=get_live_categories&${auth}`);
      const streams = await http.get(`${base}?action=get_live_streams&${auth}`);
      const mapCat = new Map<string,string>();
      (cats.data || []).forEach((c:any)=>mapCat.set(String(c.category_id), c.category_name));
      return (streams.data || []).map((s:any)=> ({
        id: String(s.stream_id),
        title: s.name,
        logo: s.stream_icon,
        group: mapCat.get(String(s.category_id)) ?? undefined,
        url: `${new URL(base).origin}/live/${p.username}/${p.password}/${s.stream_id}.m3u8`
      }));
    }
    return [];
  }
}
