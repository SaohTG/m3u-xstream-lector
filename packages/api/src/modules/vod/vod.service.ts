import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { Response } from 'express';
import { PlaylistsService } from '../playlists/playlists.service';

@Injectable()
export class VodService {
  constructor(private readonly playlists: PlaylistsService) {}

  // -------- Helpers Xtream --------
  private xt(base: string, user: string, pass: string) {
    const u = new URL('/player_api.php', base);
    u.searchParams.set('username', user);
    u.searchParams.set('password', pass);
    return u;
  }
  private async xtGet(base: URL, params: Record<string, string | number>) {
    const u = new URL(base.toString());
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v)));
    const resp = await axios.get(u.toString(), { timeout: 15000, validateStatus: s => s >= 200 && s < 500 });
    if (resp.status >= 400) throw new BadRequestException(`Xtream ${resp.status}`);
    return resp.data;
  }

  private async getXtreamBase(userId: string) {
    const pl = await this.playlists.getActiveForUser(userId);
    if (!pl) throw new BadRequestException('Aucune source liée');
    if (pl.type !== 'XTREAM') throw new BadRequestException('Live disponible uniquement pour Xtream pour le moment.');
    const baseUrl = pl.base_url!.replace(/\/+$/, '');
    return { baseUrl, user: pl.username!, pass: pl.password! };
  }

  // ================== Live HLS Proxy: manifeste ==================
  async getLiveHlsManifest(userId: string, streamId: string): Promise<string> {
    const { baseUrl, user, pass } = await this.getXtreamBase(userId);
    const upstreamBase = `${baseUrl}/live/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${encodeURIComponent(streamId)}`;
    const manifestUrl = `${upstreamBase}.m3u8`;

    const resp = await axios.get(manifestUrl, {
      responseType: 'text' as any, // axios v1: 'text'
      transformResponse: (x) => x, // prévenir JSON parse
      timeout: 15000,
      validateStatus: (s) => s >= 200 && s < 500,
    });
    if (resp.status >= 400 || typeof resp.data !== 'string') {
      throw new BadRequestException(`Upstream manifest ${resp.status}`);
    }

    const text: string = resp.data;
    // Réécriture: lignes non-# (URI) -> proxifiées
    const rewritten = text
      .split('\n')
      .map((line) => {
        const l = line.trim();
        if (!l || l.startsWith('#')) return line;
        if (/^https?:\/\//i.test(l)) {
          // URL absolue -> route seg absolu
          return `/vod/live/${encodeURIComponent(streamId)}/hls/seg?u=${encodeURIComponent(l)}`;
        }
        // relatif -> route relative
        return `/vod/live/${encodeURIComponent(streamId)}/hls/${encodeURIComponent(l)}`;
      })
      .join('\n');

    return rewritten;
  }

  // ================== Live HLS Proxy: segment absolu ==================
  async pipeLiveAbsoluteSegment(userId: string, streamId: string, u: string, res: Response) {
    const { baseUrl, user, pass } = await this.getXtreamBase(userId);
    // Sécurité minimale: l'URL absolue doit pointer sur le même host et bonne racine
    const url = new URL(u);
    const base = new URL(baseUrl);
    if (url.host !== base.host) {
      throw new BadRequestException('Host non autorisé');
    }
    if (!url.pathname.includes(`/live/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${encodeURIComponent(streamId)}`) &&
        !url.pathname.includes(`/live/${user}/${pass}/${streamId}`)) {
      throw new BadRequestException('Chemin non autorisé');
    }

    const upstream = await axios.get(url.toString(), {
      responseType: 'stream',
      timeout: 15000,
      validateStatus: (s) => s >= 200 && s < 500,
    });
    if (upstream.status >= 400) {
      throw new BadRequestException(`Upstream ${upstream.status}`);
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (upstream.headers['content-type']) res.setHeader('Content-Type', upstream.headers['content-type'] as string);
    upstream.data.pipe(res);
  }

  // ================== Live HLS Proxy: segment / playlist relatif ==================
  async pipeLiveRelative(userId: string, streamId: string, filename: string, res: Response) {
    const { baseUrl, user, pass } = await this.getXtreamBase(userId);
    const upstream = `${baseUrl}/live/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${encodeURIComponent(streamId)}/${filename}`;
    const r = await axios.get(upstream, {
      responseType: 'stream',
      timeout: 15000,
      validateStatus: (s) => s >= 200 && s < 500,
    });
    if (r.status >= 400) throw new BadRequestException(`Upstream ${r.status}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (r.headers['content-type']) res.setHeader('Content-Type', r.headers['content-type'] as string);
    r.data.pipe(res);
  }
}
