import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { LinkPlaylistDto } from './dto/link-playlist.dto';
import * as https from 'https';

@Injectable()
export class PlaylistsService {
  async link(dto: LinkPlaylistDto) {
    if (dto.type === 'M3U') {
      if (!dto.url) throw new BadRequestException('URL M3U manquante');

      // On lit SEULEMENT les premiers ~4Ko en streaming (plus robuste & rapide)
      try {
        const res = await axios.get(dto.url, {
          timeout: 8000,
          responseType: 'stream',
          maxRedirects: 5,
          validateStatus: (s) => s >= 200 && s < 400,
          headers: {
            'User-Agent': 'NovaStream/1.0 (+https://example.com)',
            'Accept': '*/*',
          },
          // si certains serveurs ont des certifs bancales (à éviter en prod)
          httpsAgent: new https.Agent({ rejectUnauthorized: true }),
        });

        let headBuf = Buffer.alloc(0);
        await new Promise<void>((resolve, reject) => {
          res.data.on('data', (chunk: Buffer) => {
            headBuf = Buffer.concat([headBuf, chunk]);
            if (headBuf.length >= 4096) {
              // On a assez de données -> stoppe le stream
              res.data.destroy();
              resolve();
            }
          });
          res.data.on('end', () => resolve());
          res.data.on('error', (err: any) => reject(err));
        });

        // Convertit en texte + gère BOM + espaces en tête
        const headStr = headBuf
          .slice(0, 4096)
          .toString('utf8')
          .replace(/^\uFEFF/, '') // BOM UTF-8
          .replace(/^\s+/, '');   // espaces / CRLF en tête

        if (!/^#EXTM3U/i.test(headStr)) {
          throw new BadRequestException('Fichier M3U invalide : en-tête #EXTM3U absent.');
        }
      } catch (e: any) {
        if (e?.response) {
          throw new BadRequestException(`M3U inaccessible (HTTP ${e.response.status}).`);
        }
        if (e?.code === 'ECONNABORTED') {
          throw new BadRequestException('M3U timeout (8s).');
        }
        if (e instanceof BadRequestException) throw e;
        throw new BadRequestException(`Erreur M3U: ${e?.message || 'inconnue'}`);
      }
    }

    if (dto.type === 'XTREAM') {
      const base = (dto.baseUrl || '').replace(/\/+$/, '');
      if (!base || !dto.username || !dto.password) {
        throw new BadRequestException('Champs Xtream manquants (baseUrl, username, password).');
      }
      const url = `${base}/player_api.php?username=${encodeURIComponent(dto.username)}&password=${encodeURIComponent(dto.password)}`;
      try {
        const res = await axios.get(url, {
          timeout: 8000,
          validateStatus: (s) => s >= 200 && s < 400,
          headers: { 'User-Agent': 'NovaStream/1.0' },
          maxRedirects: 3,
        });
        const data = res.data || {};
        const auth = Number(data?.user_info?.auth) === 1;
        const status = String(data?.user_info?.status || '').toLowerCase();
        const active = status.includes('active'); // plus tolérant (ex: "Active")
        if (!auth || !active) {
          throw new UnauthorizedException('Identifiants Xtream invalides ou compte inactif.');
        }
      } catch (e: any) {
        if (e?.response) throw new UnauthorizedException(`Xtream rejeté (HTTP ${e.response.status}).`);
        if (e?.code === 'ECONNABORTED') throw new BadRequestException('Xtream timeout (8s).');
        if (e instanceof UnauthorizedException) throw e;
        throw new BadRequestException(`Erreur Xtream: ${e?.message || 'inconnue'}`);
      }
    }

    // Validation OK -> on renvoie un drapeau explicite
    const playlistId = 'pl_' + Math.random().toString(36).slice(2, 8);
    return { validated: true, playlistId, status: 'PENDING' };
  }
}
