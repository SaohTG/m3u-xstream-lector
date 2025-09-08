import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { LinkPlaylistDto } from './dto/link-playlist.dto';

@Injectable()
export class PlaylistsService {
  async link(dto: LinkPlaylistDto) {
    if (dto.type === 'M3U') {
      if (!dto.url) throw new BadRequestException('URL M3U manquante');
      // Fetch & valider le header #EXTM3U
      try {
        const res = await axios.get<string>(dto.url, {
          timeout: 5000,
          responseType: 'text',
          // Limiter la taille si le serveur envoie un gros fichier
          maxContentLength: 1024 * 1024 * 2, // 2MB
          validateStatus: s => s >= 200 && s < 400,
        });
        const text = (res.data || '').slice(0, 2048); // on regarde le début
        if (!text.includes('#EXTM3U')) {
          throw new BadRequestException('Fichier M3U invalide (header #EXTM3U absent)');
        }
      } catch (e: any) {
        if (e?.response) {
          throw new BadRequestException(`M3U inaccessible (HTTP ${e.response.status})`);
        }
        if (e?.code === 'ECONNABORTED') {
          throw new BadRequestException('M3U timeout (5s)');
        }
        throw new BadRequestException(e?.message || 'Erreur M3U');
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
        if (!auth && !active) {
          throw new UnauthorizedException('Identifiants Xtream invalides ou inactifs');
        }
      } catch (e: any) {
        if (e?.response) {
          throw new UnauthorizedException(`Xtream rejeté (HTTP ${e.response.status})`);
        }
        if (e?.code === 'ECONNABORTED') {
          throw new BadRequestException('Xtream timeout (5s)');
        }
        if (e instanceof UnauthorizedException) throw e;
        throw new BadRequestException(e?.message || 'Erreur Xtream');
      }
    }

    // Si validation OK, on retourne un job d’import “mocké” (à remplacer par un vrai job)
    const id = 'pl_' + Math.random().toString(36).slice(2, 8);
    return { playlistId: id, status: 'PENDING' };
  }
}
