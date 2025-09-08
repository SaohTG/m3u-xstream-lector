import axios from 'axios';
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Media, MediaType } from '../entities/media.entity';

const http = axios.create({
  timeout: 30000,
  maxContentLength: 50 * 1024 * 1024,
  headers: { 'User-Agent': 'IPTV-App/1.0' },
});

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectRepository(Media) private readonly mediaRepo: Repository<Media>,
  ) {}

  private inferType(name: string, group?: string, url?: string): MediaType {
    const s = `${name} ${group ?? ''} ${url ?? ''}`.toLowerCase();
    if (/(serie|series|season|s\d+e\d+)/i.test(s)) return 'series';
    if (/(film|movie|vod)/i.test(s)) return 'movie';
    if (/(live|tv|channel|iptv)/i.test(s)) return 'live';
    // fallback par extension (m3u8 = live la plupart du temps)
    if (url?.toLowerCase().includes('.m3u8')) return 'live';
    return 'movie'; // défaut: mieux vaut remplir "Films" que rien du tout
  }

  private parseM3UText(text: string) {
    const lines = text.split(/\r?\n/);
    const out: Array<{ title: string; url: string; group?: string; type: MediaType }> = [];
    let currentTitle = '';
    let currentGroup: string | undefined;

    for (const l of lines) {
      if (l.startsWith('#EXTINF')) {
        // #EXTINF:-1 tvg-id="" tvg-name="" group-title="Movies",Title
        const grp = /group-title="([^"]+)"/i.exec(l)?.[1];
        const title = l.split(',').slice(1).join(',').trim();
        currentTitle = title || 'Sans titre';
        currentGroup = grp || undefined;
      } else if (l.startsWith('http')) {
        const url = l.trim();
        const type = this.inferType(currentTitle, currentGroup, url);
        out.push({ title: currentTitle, url, group: currentGroup, type });
        currentTitle = '';
        currentGroup = undefined;
      }
    }
    return out;
  }

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

      const items = this.parseM3UText(text);

      // Persistance (upsert par (url + title))
      // On peut d’abord regarder si certains existent déjà pour éviter les doublons.
      // Ici, on upsert naïvement.
      for (const it of items) {
        await this.mediaRepo.upsert(
          {
            title: it.title,
            url: it.url,
            type: it.type,
            groupTitle: it.group,
          },
          { conflictPaths: ['url'] }, // nécessite PG >= 9.5; OK
        );
      }

      // Retourner juste le résumé pour éviter 40 Mo:
      const counts = {
        total: items.length,
        movies: items.filter(x => x.type === 'movie').length,
        series: items.filter(x => x.type === 'series').length,
        live: items.filter(x => x.type === 'live').length,
      };

      return { ok: true, ...counts };
    } catch (err: any) {
      if (err?.code === 'ECONNABORTED') {
        throw new BadRequestException('La source M3U a mis trop de temps à répondre (timeout).');
      }
      if (err?.response) {
        throw new BadRequestException(`La source M3U a répondu ${err.response.status} ${err.response.statusText}`);
      }
      console.error('[parseM3U] failed:', err?.message || err);
      throw new InternalServerErrorException('Échec du téléchargement/parse de la M3U.');
    }
  }
}
