import axios from 'axios';
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
// ... tes imports et entités

const http = axios.create({
  timeout: 30000, // 30s
  maxContentLength: 50 * 1024 * 1024,
  headers: { 'User-Agent': 'IPTV-App/1.0 (+https://example.com)' },
  // validateStatus: (s) => s >= 200 && s < 400, // optionnel
});

@Injectable()
export class PlaylistsService {
  // ...

  async parseM3U(url: string) {
    if (!/^https?:\/\//i.test(url)) {
      throw new BadRequestException('URL M3U invalide');
    }

    try {
      const res = await http.get<string>(url, { responseType: 'text' });
      const text = res.data || '';
      if (!text || !text.includes('#EXTM3U')) {
        throw new BadRequestException('Le contenu reçu ne semble pas être une M3U');
      }

      // TODO: ton parseur existant ici
      // const items = parseM3UText(text);
      const items = this.simpleParse(text); // ou ta fonction actuelle

      return { items };
    } catch (err: any) {
      // Axios error ?
      if (err?.code === 'ECONNABORTED') {
        throw new BadRequestException('La source M3U a mis trop de temps à répondre (timeout).');
      }
      if (err?.response) {
        throw new BadRequestException(
          `La source M3U a répondu ${err.response.status} ${err.response.statusText}`,
        );
      }
      // Erreur générique : log et renvoyer 500 propre
      // (évite que Nest coupe la connexion → 502 côté Nginx)
      console.error('[parseM3U] failed:', err?.message || err);
      throw new InternalServerErrorException('Échec du téléchargement/parse de la M3U.');
    }
  }

  private simpleParse(text: string) {
    // mini parseur placeholder ; remplace par le tien
    const lines = text.split(/\r?\n/);
    const out: any[] = [];
    let current: any = {};
    for (const l of lines) {
      if (l.startsWith('#EXTINF')) {
        const name = l.split(',').slice(1).join(',').trim();
        current = { name };
      } else if (l.startsWith('http')) {
        out.push({ ...current, url: l.trim(), type: 'live' });
        current = {};
      }
    }
    return out;
  }
}
