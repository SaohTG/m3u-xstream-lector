import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Playlist } from '../playlists/playlist.entity';
import { http } from '../../common/http';
import { parseM3U } from '@novastream/shared/dist/m3u-parser.js';
import { inferType, extractSeasonEpisode, normalizeSeriesTitle } from '@novastream/shared/dist/classify.js';

function b64url(s: string) {
  return Buffer.from(s).toString('base64url');
}
function ub64url(s: string) {
  return Buffer.from(s, 'base64url').toString('utf8');
}

@Injectable()
export class VodService {
  constructor(@InjectRepository(Playlist) private repo: Repository<Playlist>) {}

  private async active() {
    return await this.repo.findOne({ where: { user_id: 'demo-user', active: true } });
  }

  // MOVIES
  async moviesRails() {
    const list = await this.moviesList();
    return [{ title: 'Films', items: list.slice(0, 24) }];
  }

  async moviesList() {
    const p = await this.active();
    if (!p) return [];
    if (p.type === 'M3U' && p.m3u_url) {
      const res = await http.get(p.m3u_url, { responseType: 'text' });
      const entries = parseM3U(res.data).filter((e)=>inferType(e)==='movie');
      return entries.map((e)=> ({
        id: b64url(e.url),
        title: e.title,
        poster: e.attributes['tvg-logo'] ?? undefined,
        streamUrl: e.url
      }));
    }
    if (p.type === 'XTREAM' && p.base_url && p.username && p.password) {
      const base = p.base_url;
      const auth = `username=${encodeURIComponent(p.username)}&password=${encodeURIComponent(p.password)}`;
      const res = await http.get(`${base}?action=get_vod_streams&${auth}`);
      return (res.data || []).map((m:any)=> ({
        id: String(m.stream_id),
        title: m.name,
        poster: m.stream_icon,
        streamUrl: `${new URL(base).origin}/movie/${p.username}/${p.password}/${m.stream_id}.mp4`
      }));
    }
    return [];
  }

  async movieInfo(id: string) {
    const p = await this.active();
    if (!p) return null;
    if (p.type === 'M3U') {
      const url = ub64url(id);
      return { id, title: 'Film', poster: undefined, streamUrl: url };
    }
    if (p.type === 'XTREAM' && p.base_url && p.username && p.password) {
      const base = p.base_url;
      const auth = `username=${encodeURIComponent(p.username)}&password=${encodeURIComponent(p.password)}`;
      const res = await http.get(`${base}?action=get_vod_info&${auth}&vod_id=${encodeURIComponent(id)}`);
      const info = res.data?.info || {};
      const ext = (info.container_extension || 'mp4').replace('.', '');
      return {
        id,
        title: info.name || 'Film',
        poster: info.cover || info.movie_image,
        streamUrl: `${new URL(base).origin}/movie/${p.username}/${p.password}/${id}.${ext}`
      };
    }
    return null;
  }

  async movieStreamUrl(id: string) {
    const p = await this.active();
    if (!p) return null;
    if (p.type === 'M3U') return ub64url(id);
    if (p.type === 'XTREAM' && p.base_url && p.username && p.password) {
      const info = await this.movieInfo(id);
      return info?.streamUrl ?? null;
    }
    return null;
  }

  // SERIES
  async seriesRails() {
    const list = await this.seriesList();
    return [{ title: 'Séries', items: list.slice(0, 24) }];
  }

  async seriesList() {
    const p = await this.active();
    if (!p) return [];
    if (p.type === 'M3U' && p.m3u_url) {
      const res = await http.get(p.m3u_url, { responseType: 'text' });
      const entries = parseM3U(res.data).filter((e)=>inferType(e)==='series');
      // group by normalized title
      const map = new Map<string, { title: string; poster?: string; episodes: any[] }>();
      for (const e of entries) {
        const baseTitle = normalizeSeriesTitle(e.title);
        const x = map.get(baseTitle) || { title: baseTitle, poster: e.attributes['tvg-logo'], episodes: [] };
        const se = extractSeasonEpisode(e.title);
        x.episodes.push({ id: b64url(e.url), title: e.title, ...se, streamUrl: e.url });
        map.set(baseTitle, x);
      }
      return Array.from(map.values()).map((v, i)=> ({
        id: b64url(v.title),
        title: v.title,
        poster: v.poster,
        seasons: {}
      }));
    }
    if (p.type === 'XTREAM' && p.base_url && p.username && p.password) {
      const base = p.base_url;
      const auth = `username=${encodeURIComponent(p.username)}&password=${encodeURIComponent(p.password)}`;
      const res = await http.get(`${base}?action=get_series&${auth}`);
      return (res.data || []).map((s:any)=> ({
        id: String(s.series_id),
        title: s.name,
        poster: s.cover
      }));
    }
    return [];
  }

  async seriesInfo(id: string) {
    const p = await this.active();
    if (!p) return null;
    if (p.type === 'M3U') {
      const title = Buffer.from(id, 'base64url').toString('utf8');
      return { id, title, poster: undefined, seasons: {} };
    }
    if (p.type === 'XTREAM' && p.base_url && p.username && p.password) {
      const base = p.base_url;
      const auth = `username=${encodeURIComponent(p.username)}&password=${encodeURIComponent(p.password)}`;
      const res = await http.get(`${base}?action=get_series_info&${auth}&series_id=${encodeURIComponent(id)}`);
      const info = res.data || {};
      return { id, title: info.info?.name || 'Série', poster: info.info?.cover, seasons: info.episodes || {} };
    }
    return null;
  }

  async episodeStreamUrl(seriesId: string, episodeId: string) {
    const p = await this.active();
    if (!p) return null;
    if (p.type === 'M3U') return Buffer.from(episodeId, 'base64url').toString('utf8');
    if (p.type === 'XTREAM' && p.base_url && p.username && p.password) {
      const base = p.base_url;
      return `${new URL(base).origin}/series/${p.username}/${p.password}/${episodeId}.mp4`;
    }
    return null;
  }
}
