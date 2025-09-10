// imports habituels
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

  /** Récupère la playlist active pour l'utilisateur (à adapter si ton modèle diffère) */
  async getActiveForUser(userId: string): Promise<Playlist | null> {
    return await this.repo.findOne({
      where: { user_id: userId, is_active: true },
    });
  }

  /** ---------- HELPERS ---------- */

  private sanitizeBase(url?: string): string {
    if (!url) return '';
    return url.replace(/\/+$/, '');
  }

  /** Certains IDs côté M3U peuvent être encodés (ex: base64 de l’URL) */
  private tryDecodeUrlId(id: string): string | null {
    if (!id) return null;
    if (/^https?:\/\//i.test(id)) return id;

    // essai base64
    try {
      const b = Buffer.from(id, 'base64').toString('utf8');
      if (/^https?:\/\//i.test(b)) return b;
    } catch {}

    // essai URI encoded
    try {
      const d = decodeURIComponent(id);
      if (/^https?:\/\//i.test(d)) return d;
    } catch {}

    return null;
  }

  /** Récupère (si tu l’as) une URL M3U depuis ton cache/DB d’items (à adapter si tu as une table vod_items) */
  private async findM3UItemUrl(_playlistId: string, _externalId: string): Promise<string | null> {
    // TODO: si tu as une table d’indexation (vod_items), remonte l’URL ici.
    return null;
  }

  /** ---------- MÉTHODES ATTENDUES PAR VodService ---------- */

  /**
   * Construit l’URL de stream HLS d’un *film* selon la source active (Xtream/M3U).
   * Signature attendue par VodService: (movieId: string) => Promise<string>
   */
  async getMovieStreamUrl(movieId: string, userId?: string): Promise<string> {
    // 1) récupère la playlist active
    // si userId non fourni, prends la plus récente active
    const playlist =
      userId ? await this.getActiveForUser(userId) :
      await this.repo.findOne({ where: { is_active: true }, order: { updated_at: 'DESC' } });

    if (!playlist) {
      throw new NotFoundException('Aucune playlist active');
    }

    const type = (playlist.type as PlaylistType) || 'XTREAM';

    if (type === 'XTREAM') {
      const base = this.sanitizeBase(
        (playlist as any).url || (playlist as any).host || (playlist as any).base_url,
      );
      const user = (playlist as any).username || (playlist as any).user;
      const pass = (playlist as any).password || (playlist as any).pass;

      if (!base || !user || !pass) {
        throw new NotFoundException('Paramètres Xtream manquants');
      }

      // schéma Xtream Codes pour VOD (m3u8 si dispo, sinon .mp4)
      return `${base}/movie/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${encodeURIComponent(
        movieId,
      )}.m3u8`;
    }

    // M3U: retrouver l’URL réelle
    const fromIndex = await this.findM3UItemUrl(playlist.id, movieId);
    if (fromIndex) return fromIndex;

    const decoded = this.tryDecodeUrlId(movieId);
    if (decoded) return decoded;

    throw new NotFoundException('URL de film introuvable');
  }

  /**
   * Construit l’URL de stream HLS d’un *épisode* de série.
   * Signature attendue par VodService: (episodeId: string) => Promise<string>
   */
  async getEpisodeStreamUrl(episodeId: string, userId?: string): Promise<string> {
    const playlist =
      userId ? await this.getActiveForUser(userId) :
      await this.repo.findOne({ where: { is_active: true }, order: { updated_at: 'DESC' } });

    if (!playlist) {
      throw new NotFoundException('Aucune playlist active');
    }

    const type = (playlist.type as PlaylistType) || 'XTREAM';

    if (type === 'XTREAM') {
      const base = this.sanitizeBase(
        (playlist as any).url || (playlist as any).host || (playlist as any).base_url,
      );
      const user = (playlist as any).username || (playlist as any).user;
      const pass = (playlist as any).password || (playlist as any).pass;

      if (!base || !user || !pass) {
        throw new NotFoundException('Paramètres Xtream manquants');
      }

      // schéma Xtream Codes pour EPISODE
      return `${base}/series/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${encodeURIComponent(
        episodeId,
      )}.m3u8`;
    }

    // M3U
    const fromIndex = await this.findM3UItemUrl(playlist.id, episodeId);
    if (fromIndex) return fromIndex;

    const decoded = this.tryDecodeUrlId(episodeId);
    if (decoded) return decoded;

    throw new NotFoundException('URL d’épisode introuvable');
  }

  /** (bonus) chaîne live si besoin plus tard */
  async getLiveStreamUrl(streamId: string, userId?: string): Promise<string> {
    const playlist =
      userId ? await this.getActiveForUser(userId) :
      await this.repo.findOne({ where: { is_active: true }, order: { updated_at: 'DESC' } });

    if (!playlist) throw new NotFoundException('Aucune playlist active');

    const type = (playlist.type as PlaylistType) || 'XTREAM';

    if (type === 'XTREAM') {
      const base = this.sanitizeBase(
        (playlist as any).url || (playlist as any).host || (playlist as any).base_url,
      );
      const user = (playlist as any).username || (playlist as any).user;
      const pass = (playlist as any).password || (playlist as any).pass;
      if (!base || !user || !pass) {
        throw new NotFoundException('Paramètres Xtream manquants');
      }
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
