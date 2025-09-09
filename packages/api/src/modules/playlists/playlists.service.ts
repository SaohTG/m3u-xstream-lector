import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { LinkPlaylistDto } from './dto/link-playlist.dto';
import * as https from 'https';

@Injectable()
export class PlaylistsService {
  async link(dto: LinkPlaylistDto) {
    if (dto.type === 'M3U') {
      if (!dto.url) throw new BadRequestException('URL M3U manquante');

      // Lecture en streaming des premiers ~4Ko pour valider le header #EXTM3U
      try {
        const res = await axios.get(dto.url, {
          timeout: 8000,
          responseType: 'stream',
          maxRedirects: 5,
          validateStatus: (s) => s >= 200 && s < 400,
          headers: {
            'User-Agent': 'NovaStream/1.0 (+https://example.com)',
            Accept: '*/*',
          },
          httpsAgent: new https.Agent({ rejectUnauthorized: true }),
        });

        let headBuf = Buffer.alloc(0);
        await new Promise<void>((resolve, reject) => {
          res.data.on('data', (chunk: Buffer) => {
            headBuf = Buffer.concat([headBuf, chunk]);
            if (headBuf.length >= 4096) {
              res.data.destroy(); // stoppe rapidement le stream
              resolve();
            }
          });
          res.data.on('end', () => resolve());
          res.data.on('error', (err: any) => reject(err));
        });

        const headStr = headBuf
          .slice(0, 4096)
          .toString('utf8')
          .replace(/^\uFEFF/, '') // retire BOM UTF-8
          .replace(/^\s+/, ''); // retire espaces éventuels en tête

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

        // Refuser tout ce qui n'est pas un JSON exploitable
        if (typeof res.data !== 'object' || res.data === null) {
          throw new UnauthorizedException('Réponse non JSON — URL Xtream invalide.');
        }

        const ui = res.data?.user_info;
        if (!ui) throw new UnauthorizedException('Réponse Xtream invalide (user_info manquant).');

        const auth = Number(ui.auth) === 1;
        const statusStr = String(ui.status ?? '').toLowerCase();
        const active = statusStr.includes('active'); // gère Active/ACTIVE

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

    // Validation OK -> on renvoie un drapeau explicite
    const playlistId = 'pl_' + Math.random().toString(36).slice(2, 8);
    return { validated: true, playlistId, status: 'PENDING' };
  }
}
