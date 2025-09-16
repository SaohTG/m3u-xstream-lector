import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as https from 'https';
import { Playlist } from './playlist.entity';

type LinkM3UDto = { type: 'm3u'; m3u_url?: string; url?: string; name?: string };
type LinkXtreamDto = { type: 'xtream'; base_url: string; username: string; password: string; name?: string };
export type LinkPlaylistDto = LinkM3UDto | LinkXtreamDto;

@Injectable()
export class PlaylistsService {
  private readonly logger = new Logger(PlaylistsService.name);

  constructor(@InjectRepository(Playlist) private readonly repo: Repository<Playlist>) {}

  // ----------- Query -----------

  /** Retourne la playlist active + la liste complète pour l’utilisateur */
  async me(userId: string) {
    const [active, all] = await Promise.all([
      this.getActiveForUser(userId),
      this.getForUser(userId),
    ]);
    return { active, all };
  }

  /** Toutes les playlists d’un user */
  async getForUser(userId: string): Promise<Playlist[]> {
    return this.repo.find({
      where: { user_id: userId } as any,
      order: { created_at: 'DESC' },
    });
  }

  /** Playlist active d’un user */
  async getActiveForUser(userId: string): Promise<Playlist | null> {
    const current = await this.repo.findOne({
      where: { user_id: userId, active: true } as any,
      order: { created_at: 'DESC' },
    });
    return current ?? null;
  }

  // ----------- Mutations -----------

  /** Désactive toutes les playlists de l’utilisateur */
  private async deactivateAll(userId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Playlist)
      .set({ active: false })
      .where('user_id = :userId', { userId })
      .andWhere('active = :active', { active: true })
      .execute();
  }

  /** Active la nouvelle playlist (désactive les autres) */
  private async activateNew(userId: string, entity: Playlist): Promise<Playlist> {
    await this.deactivateAll(userId);
    entity.active = true;
    return this.repo.save(entity);
  }

  /** Lier une playlist: M3U directe ou Xtream (converti en M3U) */
  async link(userId: string, dto: LinkPlaylistDto): Promise<{ ok: true }> {
    if (!userId) throw new Error('userId manquant');

    if (dto.type === 'm3u') {
      const m3uUrl = this.normalizeM3UUrl(dto.m3u_url ?? dto.url ?? '');
      const { entries } = await this.validateM3UNotEmpty(m3uUrl);
      this.logger.log(`M3U validée: ${entries} entrées détectées`);
      const entity = this.repo.create({
        user_id: userId,
        type: 'M3U',
        url: m3uUrl,
        name: dto.name ?? 'M3U',
        active: true,
      } as Partial<Playlist>);
      await this.activateNew(userId, entity);
      this.logger.log(`M3U liée pour user=${userId}`);
      return { ok: true };
    }

    // Xtream -> tester player_api puis construire une URL M3U fonctionnelle
    if (!dto.base_url || !dto.username || !dto.password) {
      throw new Error('Les champs base_url, username et password sont requis pour Xtream.');
    }

    const { base } = await this.assertValidXtream(dto.base_url, dto.username, dto.password);

    // Tente plusieurs variantes (protocole, ports, chemins, paramètres) jusqu’à trouver une M3U non vide
    const { workingUrl, entries } = await this.buildXtreamM3UWithFallback(base, dto.username, dto.password);
    this.logger.log(`XTREAM M3U choisie: ${workingUrl} (${entries} entrées)`);

    const entity = this.repo.create({
      user_id: userId,
      type: 'M3U', // on consomme au format M3U
      url: workingUrl,
      name: dto.name ?? `Xtream: ${stripProtocol(base)}`,
      active: true,
    } as Partial<Playlist>);

    await this.activateNew(userId, entity);
    this.logger.log(`XTREAM lié (converti M3U) pour user=${userId}`);
    return { ok: true };
  }

  /** Délier (= désactiver la playlist active) */
  async unlink(userId: string): Promise<{ ok: true }> {
    await this.deactivateAll(userId);
    return { ok: true };
  }

  // ----------- Helpers -----------

  private normalizeM3UUrl(raw: string): string {
    let u = (raw || '').trim();
    if (!u) throw new Error('URL M3U vide');
    if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
    return u;
  }

  private normalizeXtreamHost(raw: string): string {
    let h = (raw || '').trim();
    if (!h) throw new Error('Host Xtream vide');
    // Conserver le chemin (ex: /c) éventuel, juste nettoyer trailing slashes
    h = h.replace(/\s+/g, '').replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(h)) h = `http://${h}`;
    return h;
  }

  private async tryPlayerApi(base: string, username: string, password: string) {
    const url = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const cfg: AxiosRequestConfig = {
      timeout: 8000,
      maxRedirects: 0,
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        Accept: 'application/json, */*',
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      validateStatus: () => true,
    };
    return axios.get(url, cfg);
  }

  /** Vérifie l’accessibilité Xtream (HTTP/HTTPS) et l’état du compte via player_api.php */
  private async assertValidXtream(baseUrlRaw: string, username: string, password: string) {
    const allowWithout = (process.env.ALLOW_XTREAM_LINK_WITHOUT_VALIDATE ?? 'false') === 'true';

    const first = this.normalizeXtreamHost(baseUrlRaw);
    const candidates: string[] = [];
    if (/^http:\/\//i.test(first)) {
      candidates.push(first, first.replace(/^http:\/\//i, 'https://'));
    } else if (/^https:\/\//i.test(first)) {
      candidates.push(first, first.replace(/^https:\/\//i, 'http://'));
    } else {
      candidates.push(`http://${first}`, `https://${first}`);
    }

    let lastStatus = 0;
    let lastBody: any = null;

    for (const base of candidates) {
      try {
        const res = await this.tryPlayerApi(base, username, password);
        lastStatus = res.status;
        lastBody = res.data;

        if (res.status === 200 && lastBody && typeof lastBody === 'object' && lastBody.user_info) {
          const status = String(lastBody.user_info?.status || '').toLowerCase();
          if (status !== 'active') {
            throw new Error(`Compte Xtream inactif (status="${lastBody.user_info?.status}")`);
          }
          return { base };
        }
        if (res.status === 401 || res.status === 403) {
          this.logger.warn(`assertValidXtream: tentative sur ${base} => ${res.status}`);
          continue;
        }
      } catch (e: any) {
        this.logger.warn(`assertValidXtream: exception sur ${base}: ${e?.message || e}`);
        continue;
      }
    }

    if (allowWithout) {
      this.logger.warn('assertValidXtream: validation échouée, ALLOW_XTREAM_LINK_WITHOUT_VALIDATE=true => acceptée');
      return { base: this.normalizeXtreamHost(baseUrlRaw) };
    }

    if (lastStatus === 401) throw new Error('Xtream identifiants invalides (HTTP 401)');
    if (lastStatus === 403) throw new Error('Xtream inaccessible (HTTP 403) — WAF/filtrage IP probable');
    throw new Error(`Xtream non joignable (HTTP ${lastStatus || '???'})`);
  }

  /** Télécharge du texte, en basculant automatiquement https->http si EPROTO (mauvais protocole) */
  private async tryDownloadText(url: string): Promise<AxiosResponse<string>> {
    const cfg: AxiosRequestConfig = {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        Accept: 'audio/x-mpegurl, application/vnd.apple.mpegurl, */*',
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      responseType: 'text',
      validateStatus: () => true,
    };

    try {
      return await axios.get<string>(url, cfg as any);
    } catch (e: any) {
      const msg = String(e?.message || '');
      const code = e?.code || '';
      // Si on parlait en HTTPS sur un port HTTP (8080/8000/25461), retente immédiatement en HTTP
      if ((code === 'EPROTO' || msg.includes('wrong version number')) && url.startsWith('https://')) {
        const httpUrl = url.replace(/^https:\/\//i, 'http://');
        this.logger.warn(`EPROTO sur ${url} -> retry en HTTP: ${httpUrl}`);
        return await axios.get<string>(httpUrl, cfg as any);
      }
      throw e;
    }
  }

  /** Télécharge une M3U et retourne le nombre d’entrées détectées */
  private async validateM3UNotEmpty(url: string): Promise<{ entries: number; body: string }> {
    const res = await this.tryDownloadText(url);
    if (res.status !== 200) {
      throw new Error(`Lecture M3U échouée (HTTP ${res.status})`);
    }
    const body = String(res.data || '');
    if (!body.includes('#EXTM3U')) throw new Error('Fichier M3U invalide (manque #EXTM3U)');
    const entries = (body.match(/#EXTINF:/g) || []).length;
    if (entries <= 0) throw new Error('Playlist M3U vide (aucune entrée #EXTINF)');
    return { entries, body };
  }

  /**
   * Construit l’URL M3U Xtream qui fonctionne réellement (avec fallback élargi et heuristiques):
   * - protocoles: privilégie HTTP pour ports 8080/8000/25461, HTTPS pour 443/8443
   * - ports: 80, 8080, 8000, 25461 (HTTP) et 443, 8443 (HTTPS)
   * - conserve le chemin fourni par l’utilisateur (ex: /c)
   * - chemins supplémentaires testés: '', '/c', '/playlist', '/panel', '/player', '/xc', '/xtreamcodes', '/streaming', '/cms'
   * - paramètres: type=m3u_plus|m3u, output=m3u8|ts, et sans type/output
   */
  private async buildXtreamM3UWithFallback(base: string, username: string, password: string): Promise<{ workingUrl: string; entries: number }> {
    const clean = (u: string) => u.replace(/\/+$/, '');
    const normBase = clean(base);
    const u = new URL(normBase);

    const hostname = u.hostname;
    const basePath = clean(u.pathname || ''); // conserve un éventuel chemin (ex: /c). Peut être ''.
    const initialPort = u.port ? Number(u.port) : undefined;
    const initialProto = u.protocol.replace(':', '');

    // Heuristique: ports HTTP et HTTPS probables
    const httpPorts = [80, 8080, 8000, 25461];
    const httpsPorts = [443, 8443];

    const orderedHttpPorts = initialPort && initialProto === 'http'
      ? [initialPort, ...httpPorts.filter(p => p !== initialPort)]
      : httpPorts;

    const orderedHttpsPorts = initialPort && initialProto === 'https'
      ? [initialPort, ...httpsPorts.filter(p => p !== initialPort)]
      : httpsPorts;

    // Construit les origins candidats (inclut l'origine exacte en premier)
    const origins: string[] = [];
    const origExact = `${u.protocol}//${hostname}${u.port ? `:${u.port}` : ''}`;
    origins.push(origExact);

    for (const p of orderedHttpPorts) {
      const origin = `http://${hostname}${p && p !== 80 ? `:${p}` : ''}`;
      if (!origins.includes(origin)) origins.push(origin);
    }
    for (const p of orderedHttpsPorts) {
      const origin = `https://${hostname}${p && p !== 443 ? `:${p}` : ''}`;
      if (!origins.includes(origin)) origins.push(origin);
    }

    // Sous-chemins à tester en plus du chemin fourni
    const extraPaths = ['', '/c', '/playlist', '/panel', '/player', '/xc', '/xtreamcodes', '/streaming', '/cms'];

    // Paramètres selon popularité
    const paramCombos = [
      `type=m3u_plus&output=m3u8`,
      `type=m3u_plus&output=ts`,
      `type=m3u&output=m3u8`,
      `type=m3u&output=ts`,
      `type=m3u_plus`,
      `type=m3u`,
      ``,
    ];

    const q = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const urlCandidates: string[] = [];

    for (const origin of origins) {
      // On essaie d'abord avec le chemin fourni par l'utilisateur (s'il existe)
      const rootsToTry = basePath ? [`${origin}${basePath}`] : [`${origin}`];

      // Puis on ajoute les sous-chemins génériques en plus (en évitant doublons)
      for (const p of extraPaths) {
        const r = `${origin}${p}`;
        if (!rootsToTry.includes(r)) rootsToTry.push(r);
      }

      for (const root of rootsToTry) {
        for (const pc of paramCombos) {
          const tail = pc ? `&${pc}` : '';
          urlCandidates.push(`${root}/get.php?${q}${tail}`);
        }
      }
    }

    this.logger.log(`buildXtreamM3UWithFallback: ${urlCandidates.length} candidates à tester (ex: ${urlCandidates[0]})`);

    let lastErr: any = null;
    for (const url of urlCandidates) {
      try {
        const { entries } = await this.validateM3UNotEmpty(url);
        return { workingUrl: url, entries };
      } catch (e) {
        lastErr = e;
        const msg = (e as Error).message;
        this.logger.warn(`M3U candidate KO: ${url} -> ${msg}`);
        continue;
      }
    }
    throw new Error(`Impossible d’obtenir une M3U non vide via Xtream (${lastErr?.message || 'erreur inconnue'})`);
  }
}

// Utilitaires hors classe
function stripProtocol(u: string) {
  return u.replace(/^https?:\/\//i, '');
}
