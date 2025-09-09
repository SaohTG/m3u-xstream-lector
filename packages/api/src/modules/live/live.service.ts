import { BadRequestException, Injectable } from '@nestjs/common';
import { PlaylistsService } from '../playlists/playlists.service';
import axios from 'axios';
import { classifyM3U, parseM3U } from '../../utils/m3u';

@Injectable()
export class LiveService {
  constructor(private playlists: PlaylistsService) {}

  async channels(userId: string) {
    const pl = await this.playlists.getActiveForUser(userId);
    if (!pl) throw new BadRequestException('Aucune source liée.');

    if (pl.type === 'XTREAM') {
      const url = `${pl.base_url}/player_api.php?username=${encodeURIComponent(pl.username!)}&password=${encodeURIComponent(pl.password!)}&action=get_live_streams`;
      const res = await axios.get(url, { timeout: 12000, validateStatus: s => s >= 200 && s < 500, headers: { 'User-Agent': 'NovaStream/1.0' } });
      const arr = Array.isArray(res.data) ? res.data : [];
      return arr.slice(0, 500).map((x: any) => ({
        id: x.stream_id,
        name: x.name,
        logo: x.stream_icon || null,
        category_id: x.category_id || null,
        stream_type: x.stream_type || 'live',
      }));
    }

    // M3U → parse & filtre les "live"
    const resp = await axios.get(pl.url!, {
      timeout: 20000,
      responseType: 'text',
      maxContentLength: 20 * 1024 * 1024,
      validateStatus: s => s >= 200 && s < 400,
      headers: { 'User-Agent': 'NovaStream/1.0' },
    });
    const items = parseM3U(resp.data || '');
    const { live } = classifyM3U(items);
    return live.slice(0, 500).map((c, i) => ({
      id: c.tvgId || c.url || `m3u-live-${i}`,
      name: c.name,
      logo: c.logo || null,
      group: c.group || null,
      url: c.url,
    }));
  }
}
