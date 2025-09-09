import { Injectable } from '@nestjs/common';
import { VodService } from '../vod/vod.service';
import { LiveService } from '../live/live.service';
import { PlaylistsService } from '../playlists/playlists.service';

@Injectable()
export class ContentService {
  constructor(
    private vod: VodService,
    private live: LiveService,
    private playlists: PlaylistsService,
  ) {}

  async summary(userId: string) {
    const pl = await this.playlists.getActiveForUser(userId);
    const type = pl?.type || null;

    // On appelle les 3 services en parallèle, mais on coupe au bout de 15s
    const timeout = <T>(p: Promise<T>, ms = 15000) =>
      Promise.race([p, new Promise<T>((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);

    let movies = 0, shows = 0, channels = 0;
    try { movies = (await timeout(this.vod.movies(userId))).length; } catch {}
    try { shows = (await timeout(this.vod.shows(userId))).length; } catch {}
    try { channels = (await timeout(this.live.channels(userId))).length; } catch {}

    return { playlistType: type, movies, shows, channels };
  }
}
