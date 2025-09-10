import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Playlist } from './playlist.entity';

type PlaylistType = 'XTREAM' | 'M3U';

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectRepository(Playlist)
    private readonly repo: Repository<Playlist>,
  ) {}

  /** Sélection “active” côté app : on privilégie active/enabled s’ils existent, sinon la plus récente. */
  private pickActive(playlists: Playlist[]): Playlist | null {
    if (!playlists?.length) return null;
    // si l’entité expose (au runtime) active/enabled/is_active => on le privilégie
    const withFlag = playlists.find(
      (p) => (p as any).active === true || (p as any).enabled === true || (p as any).is_active === true,
    );
    return withFlag || playlists[0];
  }

  /** Playlist “active” pour un utilisateur (sans présumer des colonnes). */
  async getActiveForUser(userId: string): Promise<Playlist | null> {
    const items = await this.repo.find({
      where: { user_id: userId as any }, // user_id existe dans ton modèle
      order: { updated_at: 'DESC' as any, created_at: 'DESC' as any, id: 'DESC' as any },
      take: 50,
    });
    return this.pickActive(items);
  }

  /** Playlist “active” globale s’il n’y a pas d’utilisateur fourni. */
  private async getLatestActive(): Promise<Playlist | null> {
    const items = await this.repo.find({
      order: { updated_at: 'DESC' as any, created_at: 'DESC' as any, id: 'DESC' as any },
      take: 50,
    });
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
    // champs possibles suivant tes versions: url/base_url/host/port/username/user/password/pass
    let base: string | undefined =
      anyPl.url || anyPl.base_url || anyPl.baseUrl || anyPl.host || undefined;

    if (!base && anyPl.host) {
      base = String(anyPl.host);
      if (anyPl.port) base += `:${anyPl.port}`;
      if (!/^https?:\/\//i.test(base)) base = `http://${base}`;
    }

    const user = anyPl.username || anyPl.user;
    const pass = anyPl.password || anyPl.pass;

    return { type: (type === 'XTREAM' || type === 'M3U') ? type : 'XTREAM', base: this.sanitizeBase(base), user, pass };
  }

  /** ---------- MÉTHODES UTILISÉES PAR VodService ---------- */

  async getMovieStreamUrl(movieId: string, userId?: string): Promise<string> {
    const playlist = userId ? await this.getActiveForUser(userId) : await this.getLatestActive();
    if (!playlist) throw new NotFoundException('Aucune playlist active');

    const { type, base, user, pass } = this.extractSourceInfo(playlist);

    if (type === 'XTREAM') {
      if (!base || !user || !pass) throw new NotFoundException('Paramètres Xtream manquants');
      // film en HLS (si le serveur le sert en m3u8)
      return `${base}/movie/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${encodeURIComponent(
        movieId,
      )}.m3u8`;
    }

    // M3U
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
      return `${base}/series/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${encodeURIComponent(
        episodeId,
      )}.m3u8`;
    }

    // M3U
    const fromIndex = await this.findM3UItemUrl(playlist.id, episodeId);
    if (fromIndex) return fromIndex;
    const decoded = this.tryDecodeUrlId(episodeId);
    if (decoded) return decoded;

    throw new NotFoundException 'URL d’épisode introuvable');
  }

  /** (facultatif) Live si nécessaire ailleurs */
  async getLiveStreamUrl(streamId: string, userId?: string): Promise<string> {
    const playlist = userId ? await this.getActiveForUser(userId) : await this.getLatestActive();
    if (!playlist) throw new NotFoundException('Aucune playlist active');

    const { type, base, user, pass } = this.extractSourceInfo(playlist);

    if (type === 'XTREAM') {
      if (!base || !user || !pass) throw new NotFoundException('Paramètres Xtream manquants');
      return `${base}/live/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${encodeURIComponent(
        streamId,
      )}.m3u8`;
    }

    const fromIndex = await this.findM3UItemUrl(playlist.id, streamId);
    if (fromIndex) return fromIndex;
    const decoded = this.tryDecodeUrlId(streamId);
    if (decoded) return decoded;

    throw new NotFoundException('URL de chaîne introuvable');
  }
}
