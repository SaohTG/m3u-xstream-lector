import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios, { AxiosRequestConfig } from 'axios';
import { Playlist } from './playlist.entity';

type LinkM3UDto = { type: 'M3U'; url: string; name?: string };
type LinkXtreamDto = { type: 'XTREAM'; host: string; username: string; password: string; name?: string };
type LinkPlaylistDto = LinkM3UDto | LinkXtreamDto;

@Injectable()
export class PlaylistsService {
  private readonly logger = new Logger(PlaylistsService.name);

  constructor(@InjectRepository(Playlist) private readonly repo: Repository<Playlist>) {}

  /** Toutes les playlists d’un user */
  async getForUser(userId: string): Promise<Playlist[]> {
    return this.repo.find({
      where: { user_id: userId } as any,
      order: { created_at: 'DESC' },
    });
  }

  /** Playlist active d’un user */
  async getActiveForUser(userId: string): Promise<Playlist | null> {
    return this.repo.findOne({
      where: { user_id: userId, active: true } as any,
      order: { created_at: 'DESC' },
    });
  }

  /** Désactive toutes les playlists de l’utilisateur */
  private async deactivateAll(userId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Playlist)
      .set({ active: false })
      .where('user_id = :userId', { userId })
      .andWhere('active = :active', { active: true })
      .execute();
  }

  /** Active la nouvelle playlist (désactive les autres) */
  private async activateNew(userId: string, entity: Playlist): Promise<Playlist> {
    await this.deactivateAll(userId);
    entity.active = true;
    return this.repo.save(entity); // <-- entity est un Playlist (pas un array)
  }

  /** Lier playlist M3U ou Xtream */
  async link(userId: string, dto: LinkPlaylistDto): Promise<{ ok: true }> {
    if (!userId) throw new Error('userId manquant');

    if (dto.type === 'M3U') {
      const m3uUrl = this.normalizeM3UUrl(dto.url);
      const entity: Playlist = this.repo.create({
        user_id: userId,
        type: 'M3U',
        url: m3uUrl,
        name: dto.name ?? 'M3U',
        active: true,
      } as any);
      await this.activateNew(userId, entity);
      this.logger.log(`M3U liée pour user=${userId}`);
      return { ok: true };
    }

    // --- XTREAM ---
    const { base } = await this.assertValidXtream(dto.host, dto.username, dto.password);

    // Conversion XTREAM -> URL M3U (pipeline import unifié)
    const m3uUrl =
      `${base}/get.php?username=${encodeURIComponent(dto.username)}` +
      `&password=${encodeURIComponent(dto.password)}&type=m3u_plus&output=m3u8`;

    const entity: Playlist = this.repo.create({
      user_id: userId,
      type: 'M3U', // on importe au format M3U
      url: m3uUrl,
      name: dto.name ?? `Xtream: ${stripProtocol(base)}`,
      active: true,
    } as any);

    await this.activateNew(userId, entity);
    this.logger.log(`XTREAM lié (converti M3U) pour user=${userId}`);
    return { ok: true };
  }

  /** Délier (= désactiver la playlist active) */
  async unlink(userId: string): Promise<{ ok: true }> {
    await this.deactivateAll(userId);
    return { ok: true };
  }

  // ------------- Helpers -------------

  private normalizeM3UUrl(raw: string): string {
    let u = (raw || '').trim();
    if (!u) throw new Error('URL M3U vide');
    if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
    return u;
  }

  private normalizeXtreamHost(raw: string): string {
    let h = (raw || '').trim();
    if (!h) throw new Error('Host Xtream vide');
    h = h.replace(/\s+/g, '').replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(h)) h = `http://${h}`;
    return h;
  }

  private async tryPlayerApi(base: string, username: string, password: string) {
    const url = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const cfg: AxiosRequestConfig = {
      timeout: 8000,
      maxRedirects: 0,
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        Accept: 'application/json, */*',
      },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      validateStatus: () => true,
    };
    return axios.get(url, cfg);
  }

  /** Vérifie l’accessibilité Xtream (HTTP/HTTPS) et l’état du compte */
  private async assertValidXtream(hostRaw: string, username: string, password: string) {
    const allowWithout = (process.env.ALLOW_XTREAM_LINK_WITHOUT_VALIDATE ?? 'false') === 'true';

    const first = this.normalizeXtreamHost(hostRaw);
    const candidates: string[] = [];
    if (/^http:\/\//i.test(first)) {
      candidates.push(first, first.replace(/^http:\/\//i, 'https://'));
    } else if (/^https:\/\//i.test(first)) {
      candidates.push(first, first.replace(/^https:\/\//i, 'http://'));
    } else {
      candidates.push(`http://${first}`, `https://${first}`);
    }

    let lastStatus = 0;
    let lastBody: any = null;

    for (const base of candidates) {
      try {
        const res = await this.tryPlayerApi(base, username, password);
        lastStatus = res.status;
        lastBody = res.data;

        if (res.status === 200 && lastBody && typeof lastBody === 'object' && lastBody.user_info) {
          const status = String(lastBody.user_info?.status || '').toLowerCase();
          if (status !== 'active') {
            throw new Error(`Compte Xtream inactif (status="${lastBody.user_info?.status}")`);
          }
          return { base };
        }
        if (res.status === 401 || res.status === 403) {
          this.logger.warn(`assertValidXtream: tentative sur ${base} => ${res.status}`);
          continue;
        }
      } catch (e: any) {
        this.logger.warn(`assertValidXtream: exception sur ${base}: ${e?.message || e}`);
        continue;
      }
    }

    if (allowWithout) {
      this.logger.warn('assertValidXtream: validation échouée, ALLOW_XTREAM_LINK_WITHOUT_VALIDATE=true => acceptée');
      return { base: this.normalizeXtreamHost(hostRaw) };
    }

    if (lastStatus === 401) throw new Error('Xtream identifiants invalides (HTTP 401)');
    if (lastStatus === 403) throw new Error('Xtream inaccessible (HTTP 403) — WAF/filtrage IP probable');
    throw new Error(`Xtream non joignable (HTTP ${lastStatus || '???'})`);
  }
}

function stripProtocol(u: string) {
  return u.replace(/^https?:\/\//i, '');
}
