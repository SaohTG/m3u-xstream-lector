import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import axios from 'axios';
import { Playlist } from './playlist.entity';

type PlaylistType = 'XTREAM' | 'M3U';

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectRepository(Playlist)
    private readonly repo: Repository<Playlist>,
  ) {}

  /** Choisit une playlist "active" : si un flag (active/enabled/is_active) est présent → prioritaire, sinon la plus récente. */
  private pickActive(playlists: Playlist[]): Playlist | null {
    if (!playlists?.length) return null;
    const withFlag = playlists.find(
      (p) =>
        (p as any).active === true ||
        (p as any).enabled === true ||
        (p as any).is_active === true,
    );
    return withFlag || playlists[0];
  }

  /** Playlist “active” pour un utilisateur (ne présume pas des colonnes exactes de l’entité). */
  async getActiveForUser(userId: string): Promise<Playlist | null> {
    const where = { user_id: userId } as unknown as FindOptionsWhere<Playlist>;
    const order = { updated_at: 'DESC', created_at: 'DESC', id: 'DESC' } as any;
    const items = await this.repo.find({ where, order, take: 50 });
    return this.pickActive(items);
  }

  /** Playlist “active” globale s’il n’y a pas d’utilisateur fourni. */
  private async getLatestActive(): Promise<Playlist | null> {
    const order = { updated_at: 'DESC', created_at: 'DESC', id: 'DESC' } as any;
    const items = await this.repo.find({ order, take: 50 });
    return this.pickActive(items);
  }

  /** ---------- HELPERS ---------- */

  private sanitizeBase(url?: string): string {
    if (!url) return '';
    return url.replace(/\/+$/, '');
  }

  /** Essaie de décoder un id en URL (base64/encodeURIComponent) pour M3U. */
  private tryDecodeUrlId(id: string): string | null {
    if (!id) return null;
    if (/^https?:\/\//i.test(id)) return id;
    try {
      const b = Buffer.from(id, 'base64').toString('utf8');
      if (/^https?:\/\//i.test(b)) return b;
    } catch {}
    try {
      const d = decodeURIComponent(id);
      if (/^https?:\/\//i.test(d)) return d;
    } catch {}
    return null;
  }

  /** Si tu as une table d’indexation VOD pour M3U, fais la résolution ici (placeholder). */
  private async findM3UItemUrl(_playlistId: string, _externalId: string): Promise<string | null> {
    return null;
  }

  /** Récupère type + creds Xtream depuis la playlist, avec tolérance aux noms de colonnes. */
  private extractSourceInfo(pl: Playlist): { type: PlaylistType; base?: string; user?: string; pass?: string } {
    const anyPl = pl as any;
    const type = String(anyPl.type || '').toUpperCase() as PlaylistType;

    // champs possibles: url/base_url/baseUrl/host(+port)/username/user/password/pass
    let base: string | undefined =
      anyPl.url || anyPl.base_url || anyPl.baseUrl || anyPl.host || undefined;

    if (!base && anyPl.host) {
      base = String(anyPl.host);
      if (anyPl.port) base += `:${anyPl.port}`;
      if (!/^https?:\/\//i.test(base)) base = `http://${base}`;
    }

    const user = anyPl.username || anyPl.user;
    const pass = anyPl.password || anyPl.pass;

    return {
      type: (type === 'XTREAM' || type === 'M3U') ? type : 'XTREAM',
      base: this.sanitizeBase(base),
      user,
      pass,
    };
  }

  /** Normalise un host Xtream en URL de base */
  private buildXtreamBase(host?: string, https?: boolean, port?: string | number): string {
    if (!host) return '';
    let h = String(host).trim();
    if (!/^https?:\/\//i.test(h)) h = `${https ? 'https' : 'http'}://${h}`;
    if (port) {
      const u = new URL(h);
      if (!u.port) u.port = String(port);
      h = u.toString().replace(/\/+$/, '');
    }
    return this.sanitizeBase(h);
  }

  /** Validation rapide Xtream (player_api) */
  private async validateXtream(base: string, username: string, password: string): Promise<boolean> {
    try {
      const url = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      const r = await axios.get(url, { timeout: 10000, validateStatus: () => true });
      return r.status === 200 && !!r.data;
    } catch {
      return false;
    }
  }

  /** Validation rapide M3U (on s’assure que ça répond et que le contenu ressemble à du M3U) */
  private async validateM3U(m3uUrl: string): Promise<boolean> {
    try {
      const r = await axios.get(m3uUrl, { timeout: 10000, validateStatus: () => true, responseType: 'text' });
      if (r.status !== 200 || typeof r.data !== 'string') return false;
      return r.data.includes('#EXTM3U');
    } catch {
      return false;
    }
  }

  /** ---------- MÉTHODES UTILISÉES PAR VodService ---------- */

  async getMovieStreamUrl(movieId: string, userId?: string): Promise<string> {
    const playlist = userId ? await this.getActiveForUser(userId) : await this.getLatestActive();
    if (!playlist) throw new NotFoundException('Aucune playlist active');

    const { type, base, user, pass } = this.extractSourceInfo(playlist);

    if (type === 'XTREAM') {
      if (!base || !user || !pass) throw new NotFoundException('Paramètres Xtream manquants');
      return `${base}/movie/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${encodeURIComponent(movieId)}.m3u8`;
    }

    const fromIndex = await this.findM3UItemUrl(playlist.id, movieId);
    if (fromIndex) return fromIndex;
    const decoded = this.tryDecodeUrlId(movieId);
    if (decoded) return decoded;

    throw new NotFoundException('URL de film introuvable');
  }

  async getEpisodeStreamUrl(episodeId: string, userId?: string): Promise<string> {
    const playlist = userId ? await this.getActiveForUser(userId) : await this.getLatestActive();
    if (!playlist) throw new NotFoundException('Aucune playlist active');

    const { type, base, user, pass } = this.extractSourceInfo(playlist);

    if (type === 'XTREAM') {
      if (!base || !user || !pass) throw new NotFoundException('Paramètres Xtream manquants');
      return `${base}/series/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${encodeURIComponent(episodeId)}.m3u8`;
    }

    const fromIndex = await this.findM3UItemUrl(playlist.id, episodeId);
    if (fromIndex) return fromIndex;
    const decoded = this.tryDecodeUrlId(episodeId);
    if (decoded) return decoded;

    throw new NotFoundException('URL d’épisode introuvable');
  }

  async getLiveStreamUrl(streamId: string, userId?: string): Promise<string> {
    const playlist = userId ? await this.getActiveForUser(userId) : await this.getLatestActive();
    if (!playlist) throw new NotFoundException('Aucune playlist active');

    const { type, base, user, pass } = this.extractSourceInfo(playlist);

    if (type === 'XTREAM') {
      if (!base || !user || !pass) throw new NotFoundException('Paramètres Xtream manquants');
      return `${base}/live/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${encodeURIComponent(streamId)}.m3u8`;
    }

    const fromIndex = await this.findM3UItemUrl(playlist.id, streamId);
    if (fromIndex) return fromIndex;
    const decoded = this.tryDecodeUrlId(streamId);
    if (decoded) return decoded;

    throw new NotFoundException('URL de chaîne introuvable');
  }

  /** ---------- MÉTHODES APPELÉES PAR PlaylistsController ---------- */

  /** GET /playlists/me → renvoie la playlist active minimaliste pour l’utilisateur */
  async me(userId: string) {
    const pl = await this.getActiveForUser(userId);
    if (!pl) return { active: null };

    const anyPl = pl as any;
    return {
      active: {
        id: anyPl.id,
        type: anyPl.type,
        url: anyPl.url || anyPl.base_url || anyPl.baseUrl || anyPl.host || null,
        username: anyPl.username || anyPl.user || null,
        created_at: anyPl.created_at ?? null,
        updated_at: anyPl.updated_at ?? null,
      },
    };
  }

  /**
   * POST /playlists/link
   * Body attendu:
   *  - { type: 'XTREAM', host?: string, url?: string, username: string, password: string, https?: boolean, port?: number }
   *  - { type: 'M3U', m3u_url: string }
   */
  async link(userId: string, body: any) {
    const type = String(body?.type || '').toUpperCase() as PlaylistType;

    if (type === 'XTREAM') {
      const base = this.buildXtreamBase(body.url || body.host, body.https, body.port);
      const username = String(body.username || body.user || '');
      const password = String(body.password || body.pass || '');
      if (!base || !username || !password) {
        throw new BadRequestException('Paramètres Xtream incomplets');
      }

      // Validation (best-effort)
      const ok = await this.validateXtream(base, username, password);
      if (!ok) throw new BadRequestException('Connexion Xtream invalide');

      // on remplace les anciennes playlists de l’utilisateur (simple)
      await this.repo.delete({ user_id: userId } as any);

      const entity = this.repo.create({
        // colonnes courantes — les autres clés sont ignorées si non mappées dans l’entité
        user_id: userId as any,
        type: 'XTREAM' as any,
        url: base as any,
        username: username as any,
        password: password as any,
        updated_at: new Date() as any,
        created_at: new Date() as any,
      } as any);

      await this.repo.save(entity);
      return { ok: true, linked: { type: 'XTREAM', base, username } };
    }

    if (type === 'M3U') {
      const m3uUrl = String(body.m3u_url || body.url || '');
      if (!m3uUrl) throw new BadRequestException('URL M3U manquante');

      const ok = await this.validateM3U(m3uUrl);
      if (!ok) throw new BadRequestException('Playlist M3U invalide');

      await this.repo.delete({ user_id: userId } as any);

      const entity = this.repo.create({
        user_id: userId as any,
        type: 'M3U' as any,
        url: m3uUrl as any,
        updated_at: new Date() as any,
        created_at: new Date() as any,
      } as any);

      await this.repo.save(entity);
      return { ok: true, linked: { type: 'M3U', url: m3uUrl } };
    }

    throw new BadRequestException('Type de playlist non supporté');
  }

  /** DELETE /playlists/unlink → supprime les playlists de l’utilisateur */
  async unlink(userId: string) {
    await this.repo.delete({ user_id: userId } as any);
    return { ok: true };
  }
}
