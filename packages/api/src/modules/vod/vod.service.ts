import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { URL } from 'url';
import { PlaylistsService } from '../playlists/playlists.service';

type RailItem = {
  id: string;
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  year?: number | null;
  rating?: number | null;
};

@Injectable()
export class VodService {
  constructor(private readonly playlists: PlaylistsService) {}

  /** -------------------- HELPERS GÉNÉRAUX -------------------- */

  private parseYear(y: any): number | null {
    if (y == null) return null;
    const s = String(y).trim();
    const m = s.match(/\b(19|20)\d{2}\b/);
    return m ? Number(m[0]) : null;
  }
  private parseRating(r: any): number | null {
    if (r == null) return null;
    const n = Number(r);
    if (Number.isNaN(n)) return null;
    // Xtream a parfois rating_5based (0..5) — on normalise sur /10 si besoin
    if (n <= 5) return Math.round(n * 20) / 2; // ~ x2 puis /10
    return Math.round(n * 10) / 10;
  }
  private toDate(input: any): number {
    // renvoie epoch ms (pour trier "récemment ajouté")
    if (!input) return 0;
    const v = String(input);
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return t;
    const n = Number(v);
    if (!Number.isNaN(n)) return n * 1000;
    return 0;
  }

  /** -------------------- XTREAM LECTURE DES LISTES -------------------- */

  private async getActiveXtreamCreds(userId?: string): Promise<{ base: string; user: string; pass: string }> {
    const pl = userId
      ? await this.playlists.getActiveForUser(userId)
      : await (this.playlists as any)['getLatestActive']?.() // fallback interne
        ?? await this.playlists.getActiveForUser(userId as any);

    if (!pl) throw new NotFoundException('Aucune playlist active');
    const anyPl = pl as any;
    const type = String(anyPl.type || '').toUpperCase();
    if (type !== 'XTREAM') throw new BadRequestException('Playlist active non-Xtream (M3U non supporté pour rails films)');

    let base: string = (anyPl.url || anyPl.base_url || anyPl.baseUrl || anyPl.host || '').toString().replace(/\/+$/, '');
    if (anyPl.host && !/^https?:\/\//i.test(base)) base = `http://${base}`;
    const user = anyPl.username || anyPl.user;
    const pass = anyPl.password || anyPl.pass;
    if (!base || !user || !pass) throw new BadRequestException('Paramètres Xtream manquants');
    return { base, user: String(user), pass: String(pass) };
  }

  private async xtreamGetVodStreams(creds: { base: string; user: string; pass: string }) {
    const url = `${creds.base}/player_api.php?username=${encodeURIComponent(creds.user)}&password=${encodeURIComponent(creds.pass)}&action=get_vod_streams`;
    const r = await axios.get(url, { timeout: 15000, validateStatus: () => true });
    if (r.status !== 200 || !Array.isArray(r.data)) {
      throw new BadRequestException('Impossible de récupérer les VOD Xtream');
    }
    return r.data as any[];
  }

  private async xtreamGetVodInfo(creds: { base: string; user: string; pass: string }, streamId: string) {
    // Certains serveurs utilisent vod_id, d’autres stream_id -> on tente vod_id
    const url = `${creds.base}/player_api.php?username=${encodeURIComponent(creds.user)}&password=${encodeURIComponent(creds.pass)}&action=get_vod_info&vod_id=${encodeURIComponent(streamId)}`;
    const r = await axios.get(url, { timeout: 15000, validateStatus: () => true });
    if (r.status !== 200 || !r.data) throw new NotFoundException('Infos film introuvables');
    return r.data as any;
  }

  /** -------------------- RAILS & DÉTAILS (MOVIES) -------------------- */

  /**
   * Construit des rails "Films" à partir des streams Xtream:
   * - Récemment ajoutés (x20)
   * - Par années (Top 5 années, descendantes)
   */
  async getMovieRails(userId?: string) {
    const creds = await this.getActiveXtreamCreds(userId);
    const streams = await this.xtreamGetVodStreams(creds);

    // Normalisation
    const items: (RailItem & { addedAt: number })[] = streams.map((s: any) => {
      const id = String(s.stream_id ?? s.streamid ?? s.streamId ?? s.id ?? '');
      const title = String(s.name ?? s.title ?? 'Sans titre');
      const poster = s.stream_icon || s.movie_image || null;
      const year = this.parseYear(s.year ?? s.releaseDate);
      const rating = this.parseRating(s.rating ?? s.rating_5based);
      const addedAt = this.toDate(s.added);
      return { id, title, poster, year, rating, addedAt, backdrop: null };
    }).filter(x => x.id);

    // Récemment ajoutés
    const recently = [...items].sort((a, b) => b.addedAt - a.addedAt).slice(0, 20);

    // Par année (Top 5)
    const counts = new Map<number, number>();
    for (const it of items) {
      if (!it.year) continue;
      counts.set(it.year, (counts.get(it.year) || 0) + 1);
    }
    const topYears = [...counts.entries()]
      .sort((a, b) => b[0] - a[0]) // années récentes d’abord
      .slice(0, 5)
      .map(([y]) => y);

    const rails: Array<{ title: string; items: RailItem[] }> = [];
    if (recently.length) rails.push({ title: 'Récemment ajoutés', items: recently });

    for (const y of topYears) {
      const bucket = items.filter(it => it.year === y).slice(0, 20);
      if (bucket.length) rails.push({ title: `Films ${y}`, items: bucket });
    }

    // fallback un rail "Tous" si vide
    if (!rails.length && items.length) rails.push({ title: 'Tous les films', items: items.slice(0, 30) });

    return { rails };
  }

  async getMovieDetails(movieId: string, userId?: string) {
    const creds = await this.getActiveXtreamCreds(userId);
    const info = await this.xtreamGetVodInfo(creds, movieId);

    const i = info.info || info;
    const title = i.movie_name || i.name || i.title || 'Sans titre';
    const description = i.plot || i.description || null;
    const rating = this.parseRating(i.rating ?? i.rating_5based);
    const year = this.parseYear(i.releasedate || i.releaseDate || i.year);
    const poster = i.movie_image || i.cover || i.cover_big || null;

    // backdrop(s)
    let backdrop: string | null = null;
    if (Array.isArray(i.backdrop_path) && i.backdrop_path.length) {
      backdrop = i.backdrop_path[0];
      if (backdrop && !/^https?:\/\//i.test(backdrop)) backdrop = null;
    } else if (typeof i.backdrop_path === 'string' && i.backdrop_path) {
      backdrop = i.backdrop_path;
      if (backdrop && !/^https?:\/\//i.test(backdrop)) backdrop = null;
    }

    // genres possibles
    const genres: string[] = [];
    if (Array.isArray(i.genres)) {
      for (const g of i.genres) {
        const n = (g?.genre_name || g?.name || g || '').toString().trim();
        if (n) genres.push(n);
      }
    } else if (typeof i.genre === 'string') {
      genres.push(...i.genre.split(',').map((x: string) => x.trim()).filter(Boolean));
    }

    return {
      id: String(movieId),
      title,
      description,
      rating,
      poster,
      backdrop,
      year,
      genres,
    };
  }

  /** -------------------- HLS / PROXY (comme envoyé précédemment) -------------------- */

  // Construit le manifeste proxifié d’un film
  async buildMovieHls(movieId: string, req: any): Promise<string> {
    const apiBase = `${req.protocol}://${req.get('host')}`;
    const jwt = (req.query?.t as string) || (req.headers?.authorization?.toString().replace(/^Bearer /i, ''));
    const srcUrl = await this.playlists.getMovieStreamUrl(movieId, (req.user as any)?.sub);
    return await this.fetchAndRewriteManifest(srcUrl, apiBase, jwt || undefined);
  }

  // Construit le manifeste proxifié d’un épisode
  async buildEpisodeHls(episodeId: string, req: any): Promise<string> {
    const apiBase = `${req.protocol}://${req.get('host')}`;
    const jwt = (req.query?.t as string) || (req.headers?.authorization?.toString().replace(/^Bearer /i, ''));
    const srcUrl = await this.playlists.getEpisodeStreamUrl(episodeId, (req.user as any)?.sub);
    return await this.fetchAndRewriteManifest(srcUrl, apiBase, jwt || undefined);
  }

  // Proxy binaire d’un segment/clé
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

  /** Télécharge le manifeste original et réécrit les URLs vers /vod/proxy/seg */
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

      // Lignes URI (niveau/segment) : celles qui ne commencent pas par '#'
      if (!line.startsWith('#') && line.trim().length > 0) {
        const abs = new URL(line, base).toString();
        const proxied = `${apiBase}/vod/proxy/seg?u=${encodeURIComponent(abs)}${jwt ? `&t=${encodeURIComponent(jwt)}` : ''}`;
        out.push(proxied);
        continue;
      }

      // Lignes #EXT-X-KEY avec URI="..."
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
}
