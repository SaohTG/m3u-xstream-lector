import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as https from 'https';
import { Playlist } from './playlist.entity';

/**
 * Types d'entrée publics
 */
type LinkM3UDto = {
  type: 'm3u';
  m3u_url?: string;
  url?: string;
  name?: string;
  username?: string;
  password?: string;
};
type LinkXtreamDto = {
  type: 'xtream';
  base_url: string; // host ou URL (http/https, avec ou sans port)
  username: string;
  password: string;
  name?: string;
};
export type LinkPlaylistDto = LinkM3UDto | LinkXtreamDto;

@Injectable()
export class PlaylistsService {
  private readonly logger = new Logger(PlaylistsService.name);

  constructor(@InjectRepository(Playlist) private readonly repo: Repository<Playlist>) {}

  // ---------------------------------------------------------------------------
  // Entrée principale pour lier une playlist
  // ---------------------------------------------------------------------------
  async linkPlaylist(userId: string, dto: LinkPlaylistDto): Promise<Playlist> {
    if (!userId) throw new Error('userId manquant');

    if (dto.type === 'm3u') {
      const rawUrl = (dto.m3u_url ?? dto.url ?? '').trim();
      if (!rawUrl) throw new Error('URL M3U manquante');
      const m3uUrl = this.normalizeM3UUrl(rawUrl);

      // 1) tentative M3U directe
      try {
        const { entries } = await this.validateM3UNotEmpty(m3uUrl);
        this.logger.log(`M3U validée (${entries} entrées)`);
        const entity = this.repo.create({
          user_id: userId,
          type: 'M3U',
          url: m3uUrl,
          name: dto.name ?? 'M3U',
          active: true,
        } as Partial<Playlist>);
        await this.activateNew(userId, entity);
        return entity;
      } catch (e: any) {
        this.logger.warn(`M3U directe KO (${e?.message}). On tente la découverte Xtream si identifiants fournis.`);
      }

      // 2) fallback Xtream seulement si username/password présents
      const username = (dto as any).username as string | undefined;
      const password = (dto as any).password as string | undefined;
      if (!username || !password) {
        // Pas d'identifiants fournis → on enregistre au moins une piste XTREAM "publique"
        const publicBase = this.sanitizePublicBaseUrl(m3uUrl);
        const entity = this.repo.create({
          user_id: userId,
          type: 'XTREAM',
          url: publicBase,
          name: dto.name ?? `Xtream: ${stripProtocol(publicBase)}`,
          active: true,
        } as Partial<Playlist>);
        await this.activateNew(userId, entity);
        return entity;
      }

      // découvres la base Xtream puis crée la M3U
      return await this.linkXtreamFlow(userId, {
        type: 'xtream',
        base_url: m3uUrl,
        username,
        password,
        name: dto.name,
      } as LinkXtreamDto);
    }

    // Mode xtream explicite
    if (dto.type === 'xtream') {
      return await this.linkXtreamFlow(userId, dto);
    }

    throw new Error('Type de playlist inconnu');
  }

  // ---------------------------------------------------------------------------
  // Flux XTREAM avec découverte + génération M3U
  // ---------------------------------------------------------------------------
  private async linkXtreamFlow(userId: string, dto: LinkXtreamDto): Promise<Playlist> {
    if (!dto.base_url || !dto.username || !dto.password) {
      throw new Error('Paramètres Xtream manquants');
    }

    // 1) Découverte de la vraie base via player_api.php (http/https, ports communs)
    const discovered = await this.discoverXtreamBase(dto.base_url, dto.username, dto.password);
    if (!discovered) {
      throw new Error(`Impossible de découvrir le panel Xtream depuis "${dto.base_url}" (player_api KO sur toutes les bases)`);
    }

    // 2) Construire et tester des candidats M3U
    const candidates = this.buildM3UCandidatesFromBase(discovered, dto.username, dto.password);
    let m3uOk = false;
    for (const url of candidates) {
      try {
        const body = await this.fetchM3U(url);
        if (body && body.includes('#EXTM3U')) {
          this.logger.log(`M3U validée via Xtream: ${url}`);
          m3uOk = true;
          break;
        }
      } catch (err: any) {
        this.logger.warn(`M3U candidate KO: ${url} -> ${err?.message}`);
      }
    }
    if (!m3uOk) {
      throw new Error('Impossible d’obtenir une M3U non vide via Xtream (tous les candidats KO)');
    }

    // 3) Enregistrer la playlist XTREAM en gardant une base "publique" (sans port/chemin)
    const publicBase = this.sanitizePublicBaseUrl(discovered);
    const entity = this.repo.create({
      user_id: userId,
      type: 'XTREAM',
      url: publicBase,
      name: dto.name ?? `Xtream: ${stripProtocol(publicBase)}`,
      active: true,
    } as Partial<Playlist>);
    await this.activateNew(userId, entity);
    return entity;
  }

  // ---------------------------------------------------------------------------
  // Validation M3U directe robuste (TLS tolérant + fallback http)
  // ---------------------------------------------------------------------------
  private async validateM3UNotEmpty(url: string): Promise<{ entries: number }> {
    const doFetch = async (u: string) =>
      axios.get(u, {
        timeout: 12000,
        maxRedirects: 5,
        responseType: 'text',
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36',
          Accept: '*/*',
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      });

    let res = await doFetch(url);

    // Fallback si protocole TLS foireux et l'URL est en https:// → réessayer en http://
    const body0 = String(res.data ?? '');
    const looksBad = res.status >= 400 || !body0.includes('#EXTM3U');
    if (looksBad && url.startsWith('https://')) {
      const httpUrl = url.replace(/^https:\/\//i, 'http://');
      this.logger.warn(`HTTPS KO sur ${url}. Tentative en clair: ${httpUrl}`);
      try {
        res = await doFetch(httpUrl);
      } catch {}
    }

    const body = String(res.data ?? '');
    if (!body.includes('#EXTM3U')) {
      throw new Error(`Lecture M3U échouée (HTTP ${res.status})`);
    }
    const entries = (body.match(/^#EXTINF/igm) || []).length;
    if (entries === 0) throw new Error('M3U vide');
    return { entries };
  }

  // ---------------------------------------------------------------------------
  // Découverte panel Xtream via player_api.php
  // ---------------------------------------------------------------------------
  private XTREAM_CANDIDATE_BASES(raw: string): string[] {
    const host = stripProtocol(raw);
    const bases = [
      `https://${host}`,
      `http://${host}`,
      `http://${host}:80`,
      `http://${host}:8080`,
      `http://${host}:8000`,
      `http://${host}:2052`,
      `http://${host}:2086`,
      `http://${host}:2095`,
      `http://${host}:2179`,
    ];
    return [...new Set(bases.map((b) => b.replace(/\/+$/, '')))];
  }

  private async fetchJson(url: string): Promise<any> {
    try {
      const res = await axios.get(url, {
        timeout: 8000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36',
          Accept: 'application/json, */*',
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      });
      if (res.status === 200) return res.data;
      return { __status: res.status, __data: res.data };
    } catch (e: any) {
      return { __error: e?.message || String(e) };
    }
  }

  private async discoverXtreamBase(baseHostOrUrl: string, username: string, password: string): Promise<string | null> {
    for (const base of this.XTREAM_CANDIDATE_BASES(baseHostOrUrl)) {
      const url = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      const j = await this.fetchJson(url);
      if (j && typeof j === 'object' && j.user_info && j.server_info) {
        const serverUrl: string | undefined = j.server_info.url;
        const chosen = (serverUrl && serverUrl.startsWith('http') ? serverUrl : base).replace(/\/+$/, '');
        this.logger.log(`XTREAM discovery OK via ${base} → ${chosen}`);
        return chosen;
      }
      if (j?.__error) this.logger.warn(`XTREAM discovery error on ${url}: ${j.__error}`);
      else if (j?.__status) this.logger.warn(`XTREAM discovery KO ${url} (HTTP ${j.__status})`);
    }
    return null;
  }

  private buildM3UCandidatesFromBase(base: string, username: string, password: string): string[] {
    const qs = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    return [
      `${base}/get.php?${qs}&type=m3u_plus&output=ts`,
      `${base}/get.php?${qs}&type=m3u_plus&output=m3u8`,
      `${base}/get.php?${qs}&type=m3u&output=ts`,
      `${base}/get.php?${qs}&type=m3u&output=m3u8`,
    ];
  }

  private async fetchM3U(url: string): Promise<string> {
    const res = await axios.get(url, {
      timeout: 12000,
      maxRedirects: 5,
      responseType: 'text',
      validateStatus: () => true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36',
        Accept: '*/*',
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
    if (res.status === 200 && typeof res.data === 'string' && res.data.includes('#EXTM3U')) return res.data;
    throw new Error(`Lecture M3U échouée (HTTP ${res.status})`);
  }

  // ---------------------------------------------------------------------------
  // Gestion base de données
  // ---------------------------------------------------------------------------
  private async activateNew(userId: string, entity: Playlist): Promise<void> {
    // Désactiver les anciennes actives puis activer/sauver la nouvelle
    await this.repo.update({ user_id: userId, active: true }, { active: false });
    await this.repo.save(entity);
  }

  async getActiveForUser(userId: string): Promise<Playlist | null> {
    return await this.repo.findOne({ where: { user_id: userId, active: true } });
  }

  // ---------------------------------------------------------------------------
  // Normalisation/Nettoyage
  // ---------------------------------------------------------------------------
  private normalizeM3UUrl(raw: string): string {
    let u = (raw || '').trim();
    if (!u) throw new Error('URL M3U vide');
    if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
    return u;
  }

  private sanitizePublicBaseUrl(raw: string): string {
    // Objectif: conserver uniquement protocole + host (sans port ni chemin)
    let h = stripProtocol(raw.trim())
      .replace(/\/.*$/, '') // retire tout chemin
      .replace(/:\d+$/, ''); // retire port
    // Force https sur le public si on avait https quelque part, sinon http
    if (/^https:\/\//i.test(raw)) return `https://${h}`;
    return `http://${h}`;
  }
}

// Utilitaire hors classe
function stripProtocol(u: string) {
  return u.replace(/^https?:\/\//i, '');
}
