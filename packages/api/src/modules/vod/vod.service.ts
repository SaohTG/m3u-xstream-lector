import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PlaylistsService } from '../playlists/playlists.service';

type RailItem = {
  id: string;
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  year?: number | null;
  overview?: string | null;
  tmdb?: any;
};
type Rail = { title: string; items: RailItem[] };

@Injectable()
export class VodService {
  constructor(private readonly playlists: PlaylistsService) {}

  // -------- MOVIES --------
  async getMovieRails(userId: string): Promise<{ rails: Rail[] }> {
    // Tente d'appeler une implémentation spécifique si elle existe dans PlaylistsService
    const fn = (this.playlists as any).getMovieRails;
    if (typeof fn === 'function') {
      return await fn.call(this.playlists, userId);
    }

    // Fallback minimal : structure vide (le front ne crashe pas)
    return { rails: [] };
  }

  async getMovieDetails(userId: string, movieId: string): Promise<any> {
    const fn = (this.playlists as any).getMovieDetails;
    if (typeof fn === 'function') {
      const data = await fn.call(this.playlists, userId, movieId);
      if (!data) throw new NotFoundException('Film introuvable');
      return data;
    }

    // Fallback : essaie de retrouver le film via une liste globale si dispo
    const allFn = (this.playlists as any).getAllMovies;
    if (typeof allFn === 'function') {
      const all = await allFn.call(this.playlists, userId);
      const found = (all || []).find((m: any) => String(m.id) === String(movieId));
      if (found) return found;
    }
    throw new NotFoundException('Film introuvable');
  }

  async getMovieStreamUrl(userId: string, movieId: string): Promise<{ url: string }> {
    // Implémentation primaire exposée par PlaylistsService si présente
    const fn = (this.playlists as any).getMovieStreamUrl;
    if (typeof fn === 'function') {
      const url = await fn.call(this.playlists, userId, movieId);
      if (!url) throw new NotFoundException('URL de lecture introuvable');
      return { url };
    }

    // Fallback : certaines implémentations mettent l’URL dans les détails
    const details = await this.getMovieDetails(userId, movieId).catch(() => null);
    const url = (details as any)?.streamUrl || (details as any)?.stream_url;
    if (!url) throw new NotFoundException('URL de lecture introuvable');
    return { url };
  }

  // -------- SHOWS (Séries) --------
  async getShowRails(userId: string): Promise<{ rails: Rail[] }> {
    const fn = (this.playlists as any).getShowRails || (this.playlists as any).getSeriesRails;
    if (typeof fn === 'function') {
      return await fn.call(this.playlists, userId);
    }
    return { rails: [] };
  }

  async getSeriesDetails(userId: string, seriesId: string): Promise<any> {
    const fn = (this.playlists as any).getSeriesDetails || (this.playlists as any).getShowDetails;
    if (typeof fn === 'function') {
      const data = await fn.call(this.playlists, userId, seriesId);
      if (!data) throw new NotFoundException('Série introuvable');
      return data;
    }

    const allFn = (this.playlists as any).getAllShows || (this.playlists as any).getAllSeries;
    if (typeof allFn === 'function') {
      const all = await allFn.call(this.playlists, userId);
      const found = (all || []).find((s: any) => String(s.id) === String(seriesId));
      if (found) return found;
    }
    throw new NotFoundException('Série introuvable');
  }

  async getSeriesSeasons(userId: string, seriesId: string): Promise<any> {
    const fn =
      (this.playlists as any).getSeriesSeasons ||
      (this.playlists as any).getShowSeasons ||
      (this.playlists as any).getSeasons;
    if (typeof fn === 'function') {
      const data = await fn.call(this.playlists, userId, seriesId);
      if (!data) throw new NotFoundException('Saisons introuvables');
      return data;
    }

    // Fallback basique
    const details = await this.getSeriesDetails(userId, seriesId).catch(() => null);
    const seasons = (details as any)?.seasons || [];
    return seasons;
  }

  async getEpisodeStreamUrl(userId: string, seriesId: string, episodeId: string): Promise<{ url: string }> {
    const fn =
      (this.playlists as any).getEpisodeStreamUrl ||
      (this.playlists as any).getShowEpisodeStreamUrl;
    if (typeof fn === 'function') {
      const url = await fn.call(this.playlists, userId, seriesId, episodeId);
      if (!url) throw new NotFoundException('URL de lecture épisode introuvable');
      return { url };
    }

    // Fallback : essaye de trouver l’URL dans les saisons/épisodes
    const seasons = await this.getSeriesSeasons(userId, seriesId).catch(() => []);
    for (const s of seasons as any[]) {
      const ep = (s.episodes || []).find((e: any) => String(e.id) === String(episodeId));
      if (ep && (ep.streamUrl || ep.stream_url)) {
        return { url: ep.streamUrl || ep.stream_url };
      }
    }
    throw new NotFoundException('URL de lecture épisode introuvable');
  }

  // -------- LIVE (TV) --------
  async getLiveRails(userId: string): Promise<{ rails: Rail[] }> {
    const fn = (this.playlists as any).getLiveRails || (this.playlists as any).getChannelsRails;
    if (typeof fn === 'function') {
      return await fn.call(this.playlists, userId);
    }

    // Fallback minimal : groupe unique si on a getAllChannels
    const allFn = (this.playlists as any).getAllChannels;
    if (typeof allFn === 'function') {
      const ch = await allFn.call(this.playlists, userId);
      return [{ title: 'Toutes les chaînes', items: ch || [] }] as any;
    }
    return { rails: [] } as any;
  }

  // ---- HLS proxy helpers (si exposés dans PlaylistsService) ----
  async getLiveMasterM3U8(userId: string, chanId: string, q: any): Promise<string | { url: string }> {
    const fn = (this.playlists as any).getLiveMasterM3U8;
    if (typeof fn === 'function') {
      // Doit renvoyer soit le contenu M3U8 (string), soit {url}
      return await fn.call(this.playlists, userId, chanId, q);
    }
    // Fallback: si une URL directe est disponible
    const streamFn =
      (this.playlists as any).getLiveStreamUrl ||
      (this.playlists as any).getChannelStreamUrl;
    if (typeof streamFn === 'function') {
      const url = await streamFn.call(this.playlists, userId, chanId);
      if (!url) throw new NotFoundException('URL master M3U8 introuvable');
      return { url };
    }
    throw new BadRequestException('Proxy HLS non configuré');
  }

  async getLiveSegment(userId: string, chanId: string, q: any): Promise<Buffer | { url: string }> {
    const fn = (this.playlists as any).getLiveSegment;
    if (typeof fn === 'function') {
      // Peut renvoyer un Buffer (binaire) ou un redirect {url}
      return await fn.call(this.playlists, userId, chanId, q);
    }
    // Fallback : retour redirection si l’implémentation ne gère pas le proxy
    const streamFn =
      (this.playlists as any).getLiveStreamUrl ||
      (this.playlists as any).getChannelStreamUrl;
    if (typeof streamFn === 'function') {
      const url = await streamFn.call(this.playlists, userId, chanId);
      if (!url) throw new NotFoundException('Segment introuvable');
      return { url };
    }
    throw new BadRequestException('Proxy HLS non configuré');
  }
}
