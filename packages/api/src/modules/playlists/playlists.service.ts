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

      // Valide uniquement la M3U (pas de conversion Xtream ici)
      const { entries } = await this.validateM3UNotEmpty(m3uUrl);
      this.logger.log(`M3U validée (${entries} entrées)`);

      const entity = this.repo.create({
        user_id: userId,
        type: 'M3U',
        url: m3uUrl,
        name: (dto as any).name ?? 'M3U',
        active: true,
      } as Partial<Playlist>);
      await this.activateNew(userId, entity);
      return entity;
    }

    if (dto.type === 'xtream') {
      // Validation Xtream par player_api + enregistrement (sans M3U)
      return await this.linkXtreamFlow(userId, dto);
    }

    // Cas M3U saisi avec identifiants: on NE “convertit” PAS en M3U depuis Xtream.
    // Si l’utilisateur veut Xtream, il doit choisir type='xtream'. On reste explicite.
    throw new Error('Type de playlist inconnu');
  }

  // ---------------------------------------------------------------------------
  // Flux XTREAM : découverte + validation via player_api, pas de get.php ici
  // ---------------------------------------------------------------------------
  private async linkXtreamFlow(userId: string, dto: LinkXtreamDto): Promise<Playlist> {
    if (!dto.base_url || !dto.username || !dto.password) {
      throw new Error('Paramètres Xtream manquants');
    }

    // 1) Découvrir et valider via player_api.php
    const details = await this.discoverXtreamDetails(dto.base_url, dto.username, dto.password);
    if (!details) {
      throw new Error(`Impossible de découvrir/valider le panel Xtream depuis "${dto.base_url}"`);
    }

    // Optionnel: vérifier statut utilisateur quand dispo
    const status = String(details.userInfo?.status || '').toLowerCase();
    if (status && status !== 'active' && status !== 'true') {
      this.logger.warn(`Xtream user status non actif: "${details.userInfo?.status}"`);
    }

    // 2) Choisir un protocole “public” sans port (ports facultatifs côté UX)
    const preferHttps = String(details.serverInfo?.server_protocol || '').toLowerCase() === 'https';
    const protocol = preferHttps ? 'https' : 'http';
    const publicBase = `${protocol}://${details.host}`;

    // 3) Enregistrer la playlist XTREAM (pas de M3U)
    const entity = this.repo.create({
      user_id: userId,
      type: 'XTREAM',
      url: publicBase, // protocole + host (sans port/chemin)
      name: dto.name ?? `Xtream: ${details.host}`,
      active: true,
    } as Partial<Playlist>);
    await this.activateNew(userId, entity);
    return entity;
  }

  // ---------------------------------------------------------------------------
  // Validation M3U (TLS tolérant + fallback http)
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

    // Fallback: si HTTPS casse, retenter en HTTP
    const bad = res.status >= 400 || !String(res.data ?? '').includes('#EXTM3U');
    if (bad && url.startsWith('https://')) {
      const httpUrl = url.replace(/^https:\/\//i, 'http://');
      this.logger.warn(`HTTPS KO sur ${url}. Tentative en clair: ${httpUrl}`);
      try { res = await doFetch(httpUrl); } catch {}
    }

    const body = String(res.data ?? '');
    if (!body.includes('#EXTM3U')) throw new Error(`Lecture M3U échouée (HTTP ${res.status})`);
    const entries = (body.match(/^#EXTINF/igm) || []).length;
    if (entries === 0) throw new Error('M3U vide');
    return { entries };
  }

  // ---------------------------------------------------------------------------
  // Découverte/Validation Xtream via player_api.php (ports auto)
  // ---------------------------------------------------------------------------

  /** Extrait un hostname depuis une URL complète ou un host brut. */
  private hostFromMaybeUrl(raw: string): string {
    const r = (raw || '').trim();
    try {
      const u = new URL(/^https?:\/\//i.test(r) ? r : `http://${r}`);
      return u.hostname;
    } catch {
      return stripProtocol(r).split('/')[0].split('?')[0];
    }
  }

  /** Bases candidates pour player_api.php (http/https + ports courants). */
  private xtreamCandidateBasesForApi(hostOrUrl: string): string[] {
    const host = this.hostFromMaybeUrl(hostOrUrl);
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

  /** Découvre un endpoint player_api fonctionnel + retourne infos utiles. */
  private async discoverXtreamDetails(baseHostOrUrl: string, username: string, password: string): Promise<{
    host: string;
    chosenBase: string;
    serverInfo?: any;
    userInfo?: any;
  } | null> {
    const host = this.hostFromMaybeUrl(baseHostOrUrl);
    const candidates = this.xtreamCandidateBasesForApi(host);
    this.logger.log(`XTREAM discovery: host="${host}" candidates=${candidates.join(', ')}`);

    for (const base of candidates) {
      const url = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      const j = await this.fetchJson(url);
      if (j && typeof j === 'object' && j.user_info && j.server_info) {
        this.logger.log(`XTREAM discovery OK via ${base}`);
        return { host, chosenBase: base, serverInfo: j.server_info, userInfo: j.user_info };
      }
      if (j?.__error) this.logger.warn(`XTREAM discovery error on ${url}: ${j.__error}`);
      else if (j?.__status) this.logger.warn(`XTREAM discovery KO ${url} (HTTP ${j.__status})`);
    }
    return null;
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
    if (/^https:\/\//i.test(raw)) return `https://${h}`;
    return `http://${h}`;
  }

  // ---------------------------------------------------------------------------
  // Compat: méthodes attendues par le controller
  // ---------------------------------------------------------------------------
  async getForUser(userId: string): Promise<Playlist[]> {
    return await this.repo.find({ where: { user_id: userId }, order: { created_at: 'DESC' } });
  }

  async link(userId: string, dto: LinkPlaylistDto): Promise<Playlist> {
    return await this.linkPlaylist(userId, dto);
  }

  async unlink(userId: string): Promise<void> {
    await this.repo.update({ user_id: userId, active: true }, { active: false });
  }
}

// Utilitaire hors classe
function stripProtocol(u: string) {
  return u.replace(/^https?:\/\//i, '');
}
