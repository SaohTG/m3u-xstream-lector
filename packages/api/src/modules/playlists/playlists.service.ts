import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import * as https from 'https';
import { LinkPlaylistDto } from './dto/link-playlist.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Playlist } from './playlist.entity';

@Injectable()
export class PlaylistsService {
  constructor(@InjectRepository(Playlist) private repo: Repository<Playlist>) {}

  /**
   * Valide la source (M3U ou Xtream) ET enregistre la playlist comme "active" pour l'utilisateur.
   */
  async link(dto: LinkPlaylistDto, userId: string) {
    if (!userId) throw new UnauthorizedException('Utilisateur non authentifié');

    if (dto.type === 'M3U') {
      if (!dto.url) throw new BadRequestException('URL M3U manquante');

      try {
        const res = await axios.get(dto.url, {
          timeout: 8000,
          responseType: 'stream',
          maxRedirects: 5,
          validateStatus: (s) => s >= 200 && s < 400,
          headers: { 'User-Agent': 'NovaStream/1.0', Accept: '*/*' },
          httpsAgent: new https.Agent({ rejectUnauthorized: true }),
        });

        let headBuf = Buffer.alloc(0);
        await new Promise<void>((resolve, reject) => {
          res.data.on('data', (chunk: Buffer) => {
            headBuf = Buffer.concat([headBuf, chunk]);
            if (headBuf.length >= 4096) {
              res.data.destroy();
              resolve();
            }
          });
          res.data.on('end', () => resolve());
          res.data.on('error', (err: any) => reject(err));
        });

        const headStr = headBuf
          .slice(0, 4096)
          .toString('utf8')
          .replace(/^\uFEFF/, '')
          .replace(/^\s+/, '');

        if (!/^#EXTM3U/i.test(headStr)) {
          throw new BadRequestException('Fichier M3U invalide : en-tête #EXTM3U absent.');
        }
      } catch (e: any) {
        if (e?.response) throw new BadRequestException(`M3U inaccessible (HTTP ${e.response.status}).`);
        if (e?.code === 'ECONNABORTED') throw new BadRequestException('M3U timeout (8s).');
        if (e instanceof BadRequestException) throw e;
        throw new BadRequestException(`Erreur M3U: ${e?.message || 'inconnue'}`);
      }
    }

    if (dto.type === 'XTREAM') {
      const base = (dto.baseUrl || '').replace(/\/+$/, '');
      if (!/^https?:\/\//i.test(base)) {
        throw new BadRequestException('baseUrl doit commencer par http:// ou https://');
      }
      if (!base || !dto.username || !dto.password) {
        throw new BadRequestException('Champs Xtream manquants (baseUrl, username, password).');
      }

      const url = `${base}/player_api.php?username=${encodeURIComponent(dto.username)}&password=${encodeURIComponent(dto.password)}`;

      try {
        const res = await axios.get(url, {
          timeout: 8000,
          maxRedirects: 2,
          validateStatus: (s) => s >= 200 && s < 500,
          headers: { 'User-Agent': 'NovaStream/1.0', Accept: 'application/json' },
        });

        if (typeof res.data !== 'object' || res.data === null) {
          throw new UnauthorizedException('Réponse non JSON — URL Xtream invalide.');
        }

        const ui = res.data?.user_info;
        if (!ui) throw new UnauthorizedException('Réponse Xtream invalide (user_info manquant).');

        const auth = Number(ui.auth) === 1;
        const statusStr = String(ui.status ?? '').toLowerCase();
        const active = statusStr.includes('active');

        if (!auth || !active) {
          throw new UnauthorizedException('Identifiants Xtream invalides ou compte inactif.');
        }
      } catch (e: any) {
        if (e instanceof UnauthorizedException) throw e;
        if (e?.response) throw new UnauthorizedException(`Xtream rejeté (HTTP ${e.response.status}).`);
        if (e?.code === 'ECONNABORTED') throw new BadRequestException('Xtream timeout (8s).');
        throw new BadRequestException(`Erreur Xtream: ${e?.message || 'inconnue'}`);
      }
    }

    // Persist "active" playlist (dernière en date)
    const pl = this.repo.create({
      user_id: userId,
      type: dto.type,
      url: dto.type === 'M3U' ? dto.url! : null,
      base_url: dto.type === 'XTREAM' ? (dto.baseUrl || '').replace(/\/+$/, '') : null,
      username: dto.type === 'XTREAM' ? dto.username! : null,
      password: dto.type === 'XTREAM' ? dto.password! : null,
    });
    const saved = await this.repo.save(pl);

    return { validated: true, playlistId: saved.id, status: 'PENDING' };
  }

  /**
   * Retourne la playlist la plus récente (active) pour l’utilisateur.
   */
  async getActiveForUser(userId: string): Promise<Playlist | null> {
    return this.repo.findOne({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }
}
