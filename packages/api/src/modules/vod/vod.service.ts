import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { URL } from 'url';
import { PlaylistsService } from '../playlists/playlists.service';

@Injectable()
export class VodService {
  constructor(private readonly playlists: PlaylistsService) {}

  private async getMovieSourceUrl(movieId: string, userId?: string): Promise<string> {
    const src = await this.playlists.getMovieStreamUrl(movieId);
    if (!src) throw new BadRequestException('Source introuvable');
    return src;
  }

  private async getEpisodeSourceUrl(episodeId: string, userId?: string): Promise<string> {
    const src = await this.playlists.getEpisodeStreamUrl(episodeId);
    if (!src) throw new BadRequestException('Source introuvable');
    return src;
  }

  private async fetchAndRewriteManifest(srcUrl: string, apiBase: string, jwt?: string): Promise<string> {
    const { data: manifest } = await axios.get<string>(srcUrl, {
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 NovaStream',
        'Accept': 'application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*',
        'Referer': new URL(srcUrl).origin + '/',
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (typeof manifest !== 'string' || !manifest.includes('#EXTM3U')) {
      throw new BadRequestException('Manifeste HLS invalide');
    }

    const base = new URL(srcUrl);
    const lines = manifest.split(/\r?\n/);
    const out: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!line.startsWith('#') && line.trim().length > 0) {
        const abs = new URL(line, base).toString();
        const proxied = `${apiBase}/vod/proxy/seg?u=${encodeURIComponent(abs)}${jwt ? `&t=${encodeURIComponent(jwt)}` : ''}`;
        out.push(proxied);
        continue;
      }

      if (line.startsWith('#EXT-X-KEY') && /URI="([^"]+)"/.test(line)) {
        const uriMatch = line.match(/URI="([^"]+)"/)!;
        const absKey = new URL(uriMatch[1], base).toString();
        const proxiedKey = `${apiBase}/vod/proxy/seg?u=${encodeURIComponent(absKey)}${jwt ? `&t=${encodeURIComponent(jwt)}` : ''}`;
        out.push(line.replace(/URI="([^"]+)"/, `URI="${proxiedKey}"`));
        continue;
      }

      out.push(line);
    }

    return out.join('\n');
  }

  async buildMovieHls(movieId: string, req: any): Promise<string> {
    const apiBase = `${req.protocol}://${req.get('host')}`;
    const jwt = (req.query?.t as string) || (req.headers?.authorization?.toString().replace(/^Bearer /i, ''));
    const srcUrl = await this.getMovieSourceUrl(movieId, (req.user as any)?.sub);
    return await this.fetchAndRewriteManifest(srcUrl, apiBase, jwt || undefined);
  }

  async buildEpisodeHls(episodeId: string, req: any): Promise<string> {
    const apiBase = `${req.protocol}://${req.get('host')}`;
    const jwt = (req.query?.t as string) || (req.headers?.authorization?.toString().replace(/^Bearer /i, ''));
    const srcUrl = await this.getEpisodeSourceUrl(episodeId, (req.user as any)?.sub);
    return await this.fetchAndRewriteManifest(srcUrl, apiBase, jwt || undefined);
  }

  async pipeSegment(u: string, res: any) {
    if (!u) throw new BadRequestException('u manquant');
    const decoded = decodeURIComponent(u);
    if (!/^https?:\/\//i.test(decoded)) throw new BadRequestException('URL invalide');

    const upstream = await axios.get(decoded, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 NovaStream',
        'Accept': '*/*',
        'Origin': res.req.protocol + '//' + res.req.get('host'),
        'Referer': new URL(decoded).origin + '/',
      },
      timeout: 15000,
      validateStatus: () => true,
      maxRedirects: 5,
    });

    const ct = upstream.headers['content-type'] || 'video/mp2t';
    res.setHeader('Content-Type', Array.isArray(ct) ? ct[0] : ct);
    const cl = upstream.headers['content-length'];
    if (cl) res.setHeader('Content-Length', Array.isArray(cl) ? cl[0] : cl);
    res.setHeader('Cache-Control', 'no-store');

    upstream.data.on('error', () => res.end());
    upstream.data.pipe(res);
  }
}
