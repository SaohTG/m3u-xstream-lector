import { BadRequestException, Injectable } from '@nestjs/common';
import { PlaylistsService } from '../playlists/playlists.service';
import axios from 'axios';
import { classifyM3U, parseM3U } from '../../utils/m3u';
import * as crypto from 'crypto';

function idFrom(str: string) {
  return crypto.createHash('sha1').update(str).digest('hex'); // id stable pour M3U
}

@Injectable()
export class VodService {
  constructor(private playlists: PlaylistsService) {}

  private ensurePlaylist(pl: any) {
    if (!pl) throw new BadRequestException('Aucune source liée.');
  }

  async movies(userId: string) {
    const pl = await this.playlists.getActiveForUser(userId);
    this.ensurePlaylist(pl);

    if (pl.type === 'XTREAM') {
      const url = `${pl.base_url}/player_api.php?username=${encodeURIComponent(pl.username!)}&password=${encodeURIComponent(pl.password!)}&action=get_vod_streams`;
      const res = await axios.get(url, { timeout: 15000, validateStatus: s => s >= 200 && s < 500, headers: { 'User-Agent': 'NovaStream/1.0' } });
      const arr = Array.isArray(res.data) ? res.data : [];
      return arr.slice(0, 500).map((x: any) => ({
        id: x.stream_id,
        title: x.name,
        poster: x.stream_icon || x.cover || null,
        year: x.year || null,
        plot: x.plot || x.description || null,
        duration: x.duration || null,
        rating: x.rating || null,
        category_id: x.category_id || null,
      }));
    }

    // M3U → parse & filtre films
    const resp = await axios.get(pl.url!, {
      timeout: 30000,
      responseType: 'text',
      maxContentLength: 30 * 1024 * 1024,
      validateStatus: s => s >= 200 && s < 400,
      headers: { 'User-Agent': 'NovaStream/1.0' },
    });
    const items = parseM3U(resp.data || '');
    const { movies } = classifyM3U(items);
    return movies.slice(0, 500).map((m) => ({
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
    const pl = await this.playlists.getActiveForUser(userId);
    this.ensurePlaylist(pl);

    if (pl.type === 'XTREAM') {
      const url = `${pl.base_url}/player_api.php?username=${encodeURIComponent(pl.username!)}&password=${encodeURIComponent(pl.password!)}&action=get_series`;
      const res = await axios.get(url, { timeout: 15000, validateStatus: s => s >= 200 && s < 500, headers: { 'User-Agent': 'NovaStream/1.0' } });
      const arr = Array.isArray(res.data) ? res.data : [];
      return arr.slice(0, 500).map((x: any) => ({
        id: x.series_id,
        title: x.name,
        poster: x.cover || x.stream_icon || null,
        plot: x.plot || x.overview || null,
        rating: x.rating || null,
        category_id: x.category_id || null,
      }));
    }

    // M3U → parse & filtre séries
    const resp = await axios.get(pl.url!, {
      timeout: 30000,
      responseType: 'text',
      maxContentLength: 30 * 1024 * 1024,
      validateStatus: s => s >= 200 && s < 400,
      headers: { 'User-Agent': 'NovaStream/1.0' },
    });
    const items = parseM3U(resp.data || '');
    const { shows } = classifyM3U(items);
    return shows.slice(0, 500).map((s) => ({
      id: idFrom(s.url + 'series'),
      title: s.name,
      poster: s.logo || null,
      plot: null,
      rating: null,
      category_id: s.group || null,
    }));
  }
}
