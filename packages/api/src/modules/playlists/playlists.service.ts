import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { LinkPlaylistDto } from './dto/link-playlist.dto';

@Injectable()
export class PlaylistsService {
  async link(dto: LinkPlaylistDto) {
    if (dto.type === 'M3U') {
      if (!dto.url) throw new BadRequestException('URL M3U manquante');
      try {
        // GET et vérifie le header #EXTM3U tout au début
        const res = await axios.get<string>(dto.url, {
          timeout: 5000,
          responseType: 'text',
          maxContentLength: 2 * 1024 * 1024,
          validateStatus: s => s >= 200 && s < 400,
        });
        const head = (res.data || '').slice(0, 128).trim();
        if (!head.startsWith('#EXTM3U')) {
          throw new BadRequestException('Fichier M3U invalide (header #EXTM3U attendu)');
        }
      } catch (e: any) {
        if (e?.response) throw new BadRequestException(`M3U inaccessible (HTTP ${e.response.status})`);
        if (e?.code === 'ECONNABORTED') throw new BadRequestException('M3U timeout (5s)');
        if (e instanceof BadRequestException) throw e;
        throw new BadRequestException('Erreur M3U');
      }
    }

    if (dto.type === 'XTREAM') {
      const base = (dto.baseUrl || '').replace(/\/+$/,'');
      if (!base || !dto.username || !dto.password) {
        throw new BadRequestException('Champs Xtream manquants (baseUrl, username, password)');
      }
      const url = `${base}/player_api.php?username=${encodeURIComponent(dto.username)}&password=${encodeURIComponent(dto.password)}`;
      try {
        const res = await axios.get(url, { timeout: 5000, validateStatus: s => s >= 200 && s < 400 });
        const data = res.data || {};
        const auth = Number(data?.user_info?.auth) === 1;
        const active = String(data?.user_info?.status || '').toLowerCase() === 'active';
        if (!auth || !active) throw new UnauthorizedException('Identifiants Xtream invalides ou inactifs');
      } catch (e: any) {
        if (e?.response) throw new UnauthorizedException(`Xtream rejeté (HTTP ${e.response.status})`);
        if (e?.code === 'ECONNABORTED') throw new BadRequestException('Xtream timeout (5s)');
        if (e instanceof UnauthorizedException) throw e;
        throw new BadRequestException('Erreur Xtream');
      }
    }

    // Si on arrive ici, la validation est OK
    const playlistId = 'pl_' + Math.random().toString(36).slice(2, 8);
    return { validated: true, playlistId, status: 'PENDING' };
  }
}
