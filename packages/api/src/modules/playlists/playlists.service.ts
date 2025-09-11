import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import { Playlist } from './playlist.entity';
import { LinkPlaylistDto } from './dto/link-playlist.dto';

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectRepository(Playlist)
    private readonly repo: Repository<Playlist>,
  ) {}

  /** Liste des playlists de l'utilisateur (la plus récente d'abord) */
  async getForUser(userId: string) {
    return this.repo.find({
      where: { user_id: userId } as any,
      order: { created_at: 'DESC' } as any,
    });
  }

  /** Désactive la playlist active */
  async unlink(userId: string) {
    await this.repo.update({ user_id: userId } as any, { active: false } as any);
    return { ok: true };
  }

  /** Lier une playlist M3U ou Xtream (validation incluse) */
  async link(userId: string, dto: LinkPlaylistDto) {
    // Back-compat (certains fronts envoient "url" au lieu de "m3u_url")
    if (dto.type === 'm3u' && !dto.m3u_url && (dto as any).url) {
      dto.m3u_url = (dto as any).url;
    }

    if (dto.type === 'm3u') {
      const url = (dto.m3u_url || '').trim();
      if (!url) throw new BadRequestException('m3u_url requis');
      await this.assertValidM3U(url);

      // Désactiver toute playlist existante de l'utilisateur
      await this.repo.update({ user_id: userId } as any, { active: false } as any);

      const entity: Playlist = this.repo.create({
        user_id: userId,
        type: 'm3u',
        url,
        name: dto.name || 'M3U',
        active: true,
        created_at: new Date(),
      } as any);

      // ⚠️ Typage explicite pour éviter l’inférence Playlist[]
      const saved: Playlist = await this.repo.save(entity as Playlist);
      return { ok: true, playlist_id: this.getPk(saved) };
    }

    if (dto.type === 'xtream') {
      const base_url = (dto.base_url || '').trim().replace(/\/+$/, '');
      const username = (dto.username || '').trim();
      const password = (dto.password || '').trim();
      if (!base_url || !username || !password) {
        throw new BadRequestException('base_url, username et password requis');
      }
      await this.assertValidXtream(base_url, username, password);

      await this.repo.update({ user_id: userId } as any, { active: false } as any);

      const entity: Playlist = this.repo.create({
        user_id: userId,
        type: 'xtream',
        base_url,
        username,
        password,
        name: dto.name || 'Xtream',
        active: true,
        created_at: new Date(),
      } as any);

      // ⚠️ Typage explicite
      const saved: Playlist = await this.repo.save(entity as Playlist);
      return { ok: true, playlist_id: this.getPk(saved) };
    }

    throw new BadRequestException('type invalide (m3u|xtream)');
  }

  /** Playlist active pour l'utilisateur (utile pour VOD/live) */
  async getActiveForUser(userId: string): Promise<Playlist | null> {
    return this.repo.findOne({ where: { user_id: userId, active: true } as any });
  }

  // ----------------- Validations distantes -----------------

  private async assertValidM3U(url: string) {
    try {
      const res = await axios.get(url, {
        timeout: 7000,
        responseType: 'text',
        validateStatus: () => true,
      });
      const text: string = typeof res.data === 'string' ? res.data : `${res.data}`;
      if (!/^#EXTM3U/m.test(text)) {
        throw new BadRequestException('Playlist M3U invalide (manque #EXTM3U)');
      }
      if (res.status >= 400) {
        throw new BadRequestException(`M3U inaccessible (HTTP ${res.status})`);
      }
    } catch (e: any) {
      if (e?.response) {
        throw new BadRequestException(`M3U inaccessible (HTTP ${e.response.status})`);
      }
      throw new BadRequestException('Impossible de valider la M3U (réseau/timeout)');
    }
  }

  private async assertValidXtream(base_url: string, username: string, password: string) {
    const url = `${base_url}/player_api.php?username=${encodeURIComponent(
      username,
    )}&password=${encodeURIComponent(password)}`;
    try {
      const res = await axios.get(url, { timeout: 7000, validateStatus: () => true });
      if (res.status >= 400) {
        throw new BadRequestException(`Xtream inaccessible (HTTP ${res.status})`);
      }
      const ok =
        !!res.data &&
        (res.data.user_info?.auth === 1 || res.data.user_info?.status === 'Active');
      if (!ok) throw new BadRequestException('Identifiants Xtream invalides');
    } catch (e: any) {
      if (e?.response) {
        throw new BadRequestException(`Xtream inaccessible (HTTP ${e.response.status})`);
      }
      throw new BadRequestException('Impossible de valider Xtream (réseau/timeout)');
    }
  }

  // ----------------- Stubs (utilisés par VodService) -----------------

  async getMovieRails(userId: string) {
    return { rails: [] };
  }

  async getShowRails(userId: string) {
    return { rails: [] };
  }

  async getLiveRails(userId: string) {
    return { rails: [] };
  }

  // ----------------- Utils -----------------

  /** Récupère la PK quelle que soit la nomenclature (id / playlist_id) */
  private getPk(p: Playlist): string | number | undefined {
    return (p as any).id ?? (p as any).playlist_id ?? (p as any).ID;
  }
}
