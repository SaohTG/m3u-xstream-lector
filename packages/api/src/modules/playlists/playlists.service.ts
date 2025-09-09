import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Playlist } from './playlist.entity';

type LinkDto =
  | { type: 'M3U'; url: string }
  | { type: 'XTREAM'; base_url: string; username: string; password: string };

@Injectable()
export class PlaylistsService {
  constructor(@InjectRepository(Playlist) private repo: Repository<Playlist>) {}

  // ************ PUBLIC API UTILISÉE PAR D’AUTRES MODULES ************
  async getActiveForUser(userId: string): Promise<{
    type: 'M3U' | 'XTREAM';
    url?: string | null;
    base_url?: string | null;
    username?: string | null;
    password?: string | null;
  } | null> {
    const p = await this.repo.findOne({
      where: { user_id: userId, active: true },
      order: { updated_at: 'DESC' },
    });
    if (!p) return null;
    return {
      type: p.type,
      url: p.url,
      base_url: p.base_url,
      username: p.username,
      password: p.password,
    };
  }

  // ************ ENDPOINTS CONTROLLER ************
  async link(userId: string, dto: LinkDto) {
    if (dto.type === 'M3U') {
      if (!dto.url || !/^https?:\/\//i.test(dto.url)) {
        throw new BadRequestException('URL M3U invalide');
      }
      // ping M3U
      try {
        const resp = await axios.get(dto.url, {
          timeout: 12000,
          responseType: 'text',
          maxContentLength: 50 * 1024 * 1024,
          validateStatus: (s) => s >= 200 && s < 400,
        });
        const text = String(resp.data || '');
        if (!text.trim().startsWith('#EXTM3U')) {
          throw new BadRequestException('Le contenu fourni ne ressemble pas à une M3U');
        }
      } catch (e: any) {
        throw new BadRequestException('Impossible de valider la M3U: ' + (e?.message || e));
      }

      await this.repo.update({ user_id: userId, active: true }, { active: false });
      const saved = await this.repo.save(
        this.repo.create({
          user_id: userId,
          type: 'M3U',
          url: dto.url,
          base_url: null,
          username: null,
          password: null,
          active: true,
        }),
      );
      return this.sanitize(saved);
    }

    // XTREAM
    if (!dto.base_url || !/^https?:\/\//i.test(dto.base_url) || !dto.username || !dto.password) {
      throw new BadRequestException('Paramètres Xtream incomplets');
    }
    const panel = new URL('/player_api.php', dto.base_url);
    panel.searchParams.set('username', dto.username);
    panel.searchParams.set('password', dto.password);
    try {
      const resp = await axios.get(panel.toString(), {
        timeout: 12000,
        validateStatus: (s) => s >= 200 && s < 500,
      });
      const ok = resp.data?.user_info?.auth === 1 || resp.data?.user_info?.status === 'Active';
      if (!ok) throw new Error('Connexion Xtream refusée (credentials invalides)');
    } catch (e: any) {
      throw new BadRequestException('Impossible de valider Xtream: ' + (e?.message || e));
    }

    await this.repo.update({ user_id: userId, active: true }, { active: false });
    const saved = await this.repo.save(
      this.repo.create({
        user_id: userId,
        type: 'XTREAM',
        url: null,
        base_url: dto.base_url.replace(/\/+$/, ''),
        username: dto.username,
        password: dto.password,
        active: true,
      }),
    );
    return this.sanitize(saved);
  }

  async unlink(userId: string) {
    await this.repo.update({ user_id: userId, active: true }, { active: false });
    return { ok: true };
  }

  async me(userId: string) {
    const p = await this.repo.findOne({ where: { user_id: userId, active: true } });
    if (!p) return null;
    return this.sanitize(p);
  }

  private sanitize(p: Playlist) {
    // Ne pas renvoyer le password au front
    return {
      id: p.id,
      type: p.type,
      url: p.url,
      base_url: p.base_url,
      username: p.username,
      active: p.active,
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
  }
}
