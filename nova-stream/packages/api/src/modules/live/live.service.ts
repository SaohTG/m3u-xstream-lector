import { Injectable, Logger } from '@nestjs/common';
import { PlaylistsService } from '../playlists/playlists.service';
import { HttpService } from '../../common/http';
import { PlaylistNotFoundException } from '../../common/errors';
import { Playlist } from '../playlists/playlist.entity';
import {
  LiveChannel,
  parseM3U,
  inferM3UItemType,
  generateM3UItemId,
  XtreamLiveStream,
  buildXtreamLiveUrl,
  XtreamLiveCategory,
} from '@novastream/shared';
import { AxiosInstance } from 'axios';

@Injectable()
export class LiveService {
  private readonly logger = new Logger(LiveService.name);
  private readonly axios: AxiosInstance;

  constructor(
    private readonly playlistsService: PlaylistsService,
    private readonly httpService: HttpService,
  ) {
    this.axios = this.httpService.getInstance();
  }

  async getChannels(userId: string): Promise<LiveChannel[]> {
    const playlist = await this.playlistsService.getActiveWithPassword(userId);
    if (!playlist) {
      this.logger.warn('No active playlist found.');
      return [];
    }

    if (playlist.type === 'M3U') {
      return this.getM3UChannels(playlist);
    } else if (playlist.type === 'XTREAM') {
      return this.getXtreamChannels(playlist);
    }

    return [];
  }

  private async getM3UChannels(playlist: Playlist): Promise<LiveChannel[]> {
    this.logger.log(`Fetching M3U channels from ${playlist.m3uUrl}`);
    try {
      const { data: content } = await this.axios.get(playlist.m3uUrl, { responseType: 'text' });
      const items = parseM3U(content);

      return items
        .filter(item => inferM3UItemType(item) === 'live')
        .map(item => ({
          id: generateM3UItemId(item.url),
          title: item.title,
          logo: item.attributes['tvg-logo'],
          group: item.attributes['group-title'] || 'Uncategorized',
          url: item.url,
        }));
    } catch (error) {
      this.logger.error(`Failed to fetch or parse M3U: ${error.message}`);
      return [];
    }
  }

  private async getXtreamChannels(playlist: Playlist): Promise<LiveChannel[]> {
    if (!playlist.baseUrl || !playlist.username || !playlist.password) {
        throw new PlaylistNotFoundException('Xtream playlist is not properly configured.');
    }
    this.logger.log(`Fetching Xtream channels from ${playlist.baseUrl}`);

    try {
      const [categoriesResponse, streamsResponse] = await Promise.all([
        this.axios.get<XtreamLiveCategory[]>(`${playlist.baseUrl}/player_api.php`, {
          params: {
            username: playlist.username,
            password: playlist.password,
            action: 'get_live_categories',
          },
        }),
        this.axios.get<XtreamLiveStream[]>(`${playlist.baseUrl}/player_api.php`, {
            params: {
              username: playlist.username,
              password: playlist.password,
              action: 'get_live_streams',
            },
          }),
      ]);

      const categoryMap = new Map(categoriesResponse.data.map(c => [c.category_id, c.category_name]));

      return streamsResponse.data.map(stream => ({
        id: String(stream.stream_id),
        title: stream.name,
        logo: stream.stream_icon,
        group: categoryMap.get(stream.category_id) || 'Uncategorized',
        url: buildXtreamLiveUrl(playlist.baseUrl, playlist.username, playlist.password, stream.stream_id),
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch Xtream channels: ${error.message}`);
      return [];
    }
  }
}
