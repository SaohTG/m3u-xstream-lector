import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository, DeepPartial } from 'typeorm';
import { Playlist } from './playlist.entity';
import { LinkPlaylistDto } from './dto/link-playlist.dto';

@Injectable()
export class PlaylistsService {
  private readonly logger = new Logger(PlaylistsService.name);

  constructor(
    @InjectRepository(Playlist)
    private readonly repo: Repository<Playlist>,
  ) {}

  async getForUser(userId: string) {
    return this.repo.find({
      where: { user_id: userId } as any,
      order: { created_at: 'DESC' } as any,
    });
  }

  async unlink(userId: string) {
    await this.repo.update({ user_id: userId } as any, { active: false } as any);
    return { ok: true };
  }

  async link(userId: string, dto: LinkPlaylistDto) {
    // rétro-compat éventuelle
    if (dto.type === 'm3u' && !dto.m3u_url && (dto as any).url) {
      dto.m3u_url = (dto as any).url;
    }

    if (dto.type === 'm3u') {
      const url = (dto.m3u_url || '').trim();
      if (!url) throw new BadRequestException('m3u_url requis');

      await this.assertValidM3U(url);

      await this.repo.update({ user_id: userId } as any, { active: false } as any);

      const payload: DeepPartial<Playlist> = {
        user_id: userId,
        type: 'M3U',
        url,
        name: dto.name || 'M3U',
        active: true,
        created_at: new Date(),
      };
      const entity = this.repo.create(payload);
      const saved = await this.repo.save(entity);
      return { ok: true, playlist_id: this.getPk(saved) };
    }

    if (dto.type === 'xtream') {
      let base = (dto.base_url || '').trim();
      const username = (dto.username || '').trim();
      const password = (dto.password || '').trim();
      if (!base || !username || !password) {
        throw new BadRequestException('base_url, username et password requis');
      }

      base = this.normalizeBaseUrl(base);

      await this.assertValidXtream(base, username, password);

      await this.repo.update({ user_id: userId } as any, { active: false } as any);

      const payload: DeepPartial<Playlist> = {
        user_id: userId,
        type: 'XTREAM',
        base_url: base,
        username,
        password,
        name: dto.name || 'Xtream',
        active: true,
        created_at: new Date(),
      };
      const entity = this.repo.create(payload);
      const saved = await this.repo.save(entity);
      return { ok: true, playlist_id: this.getPk(saved) };
    }

    throw new BadRequestException('type invalide (m3u|xtream)');
  }

  async getActiveForUser(userId: string): Promise<Playlist | null> {
    return this.repo.findOne({ where: { user_id: userId, active: true } as any });
  }

  // ---------- Validation distante ----------

  private async assertValidM3U(url: string) {
    try {
      const res = await axios.get(url, {
        timeout: 10000,
        responseType: 'text',
        validateStatus: () => true,
      });
      const text: string = typeof res.data === 'string' ? res.data : `${res.data}`;
      if (res.status >= 400) {
        throw new BadRequestException(`M3U inaccessible (HTTP ${res.status})`);
      }
      if (!/^#EXTM3U/m.test(text)) {
        throw new BadRequestException('Playlist M3U invalide (manque #EXTM3U)');
      }
    } catch (e: any) {
      this.logger.warn(`assertValidM3U: ${e?.message || e}`);
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Impossible de valider la M3U (réseau/timeout)');
    }
  }

  private async assertValidXtream(base_url: string, username: string, password: string) {
    const url = `${base_url}/player_api.php?username=${encodeURIComponent(
      username,
    )}&password=${encodeURIComponent(password)}`;
    try {
      const res = await axios.get(url, { timeout: 10000, validateStatus: () => true });
      if (res.status >= 400) {
        throw new BadRequestException(`Xtream inaccessible (HTTP ${res.status})`);
      }
      if (!res.data || typeof res.data !== 'object') {
        throw new BadRequestException('Réponse Xtream invalide');
      }
      const info = (res.data as any).user_info;
      const ok = info && (info.auth === 1 || info.status === 'Active');
      if (!ok) {
        throw new BadRequestException('Identifiants Xtream invalides ou compte inactif');
      }
    } catch (e: any) {
      this.logger.warn(`assertValidXtream: ${e?.message || e}`);
      if (e instanceof BadRequestException) throw e;

      // erreurs réseau courantes → 400 lisible
      const code = e?.code || '';
      if (['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'].includes(code)) {
        throw new BadRequestException('Base URL Xtream injoignable (DNS/connexion)');
      }
      throw new BadRequestException('Impossible de valider Xtream (réseau/timeout)');
    }
  }

  // ---------- Utils ----------

  private normalizeBaseUrl(input: string) {
    let u = input.trim();
    if (!/^https?:\/\//i.test(u)) {
      // par défaut https, repasse en http si besoin
      u = `https://${u}`;
    }
    u = u.replace(/\/+$/, ''); // retire les trailing slashes
    return u;
  }

  private getPk(p: Playlist): string | number | undefined {
    return (p as any).id ?? (p as any).playlist_id ?? (p as any).ID;
  }
}
