import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { PlaylistSource } from '../../entities/playlist-source.entity';
import { MediaItem } from '../../entities/media-item.entity';
import { parseM3U } from './m3u.parser';
import { TmdbService } from '../tmdb/tmdb.service';

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectRepository(PlaylistSource) private sources: Repository<PlaylistSource>,
    @InjectRepository(MediaItem) private media: Repository<MediaItem>,
    private tmdb: TmdbService
  ) {}

  async parseM3U(url: string) {
    const res = await axios.get(url, { responseType: 'text' });
    const rawItems = parseM3U(res.data);
    const items = await Promise.all(rawItems.map(async (r) => {
      const type = this.inferType(r.group, r.title);
      const posterUrl = await this.tmdb.findPoster(r.title || '');
      const externalId = `m3u:${(r.tvgId || r.title || r.url || Math.random().toString()).slice(0,50)}`;
      return {
        externalId,
        type,
        title: r.title || 'Untitled',
        group: r.group,
        posterUrl: posterUrl || r.tvgLogo,
        streamUrl: r.url
      };
    }));
    return { items };
  }

  async xtreamConnect(baseUrl: string, username: string, password: string) {
    const api = `${baseUrl.replace(/\/$/,'')}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const res = await axios.get(api);
    const data = res.data;
    // Minimal normalization: categories if provided
    return { info: data.user_info || {}, server: data.server_info || {}, data };
  }

  private inferType(group?: string, title?: string): 'movie'|'series'|'channel' {
    const g = (group || '').toLowerCase();
    if (g.includes('series') || g.includes('série')) return 'series';
    if (g.includes('movie') || g.includes('film')) return 'movie';
    // Fallback: try a heuristic
    if (title && /(s\d+e\d+|season)/i.test(title)) return 'series';
    return 'channel';
  }
}
