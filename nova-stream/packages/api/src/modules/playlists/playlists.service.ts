import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Playlist } from './playlist.entity';
import { LinkPlaylistDto } from './dto/link-playlist.dto';
import { HttpService } from '../../common/http';
import {
  validateM3U,
  discoverAndValidateXtream,
} from '@novastream/shared';
import { PlaylistValidationException } from '../../common/errors';
import { AxiosInstance } from 'axios';

@Injectable()
export class PlaylistsService {
  private readonly logger = new Logger(PlaylistsService.name);
  private readonly axios: AxiosInstance;

  constructor(
    @InjectRepository(Playlist)
    private playlistsRepository: Repository<Playlist>,
    private readonly dataSource: DataSource,
    private readonly httpService: HttpService,
  ) {
    this.axios = this.httpService.getInstance();
  }

  async link(dto: LinkPlaylistDto, userId: string): Promise<Playlist> {
    return this.dataSource.transaction(async (manager) => {
      // Deactivate any currently active playlist for the user
      await manager.update(Playlist, { user_id: userId, active: true }, { active: false });

      let newPlaylist: Playlist;
      if (dto.type === 'M3U') {
        newPlaylist = await this.linkM3U(dto, userId, manager);
      } else {
        newPlaylist = await this.linkXtream(dto, userId, manager);
      }

      return newPlaylist;
    });
  }

  async unlink(userId: string): Promise<{ success: boolean }> {
    await this.playlistsRepository.update(
      { user_id: userId, active: true },
      { active: false },
    );
    return { success: true };
  }

  async getActive(userId: string): Promise<Playlist | null> {
    return this.playlistsRepository.findOneBy({ user_id: userId, active: true });
  }

  async getActiveWithPassword(userId: string): Promise<Playlist | null> {
    // This is used internally by other services that need the password
    return this.playlistsRepository.createQueryBuilder('playlist')
      .addSelect('playlist.password')
      .where('playlist.user_id = :userId', { userId })
      .andWhere('playlist.active = :active', { active: true })
      .getOne();
  }

  private async linkM3U(dto: LinkPlaylistDto, userId: string, manager: any): Promise<Playlist> {
    this.logger.log(`Validating M3U URL: ${dto.url}`);
    await this.validateM3UUrl(dto.url);

    const playlist = manager.create(Playlist, {
      user_id: userId,
      type: 'M3U',
      name: dto.name || `M3U Playlist`,
      m3uUrl: dto.url,
      active: true,
    });

    return manager.save(playlist);
  }

  private async validateM3UUrl(url: string): Promise<void> {
    let content = '';
    try {
      const response = await this.axios.get(url, { responseType: 'text' });
      content = response.data;
    } catch (error) {
      this.logger.warn(`Failed to fetch M3U from ${url} (https), trying http.`);
      if (url.startsWith('https://')) {
        try {
          const httpUrl = url.replace('https://', 'http://');
          const response = await this.axios.get(httpUrl, { responseType: 'text' });
          content = response.data;
        } catch (httpError) {
          this.logger.error(`Failed to fetch M3U from both https and http: ${url}`);
          throw new PlaylistValidationException('Could not fetch M3U content.');
        }
      } else {
        throw new PlaylistValidationException('Could not fetch M3U content.');
      }
    }

    if (!validateM3U(content)) {
      throw new PlaylistValidationException(
        'Invalid M3U content. Must start with #EXTM3U and contain at least one #EXTINF entry.',
      );
    }
  }

  private async linkXtream(dto: LinkPlaylistDto, userId: string, manager: any): Promise<Playlist> {
    this.logger.log(`Discovering Xtream server for host: ${dto.host}`);

    const fetcher = (url: string, params?: Record<string, any>) =>
      this.axios.get(url, { params });

    try {
      const { host, chosenBaseUrl } = await discoverAndValidateXtream(
        dto.host,
        dto.username,
        dto.password,
        fetcher,
      );

      const playlist = manager.create(Playlist, {
        user_id: userId,
        type: 'XTREAM',
        name: dto.name || `Xtream Playlist`,
        url: `${new URL(chosenBaseUrl).protocol}//${host}`,
        baseUrl: chosenBaseUrl,
        username: dto.username,
        password: dto.password,
        active: true,
      });

      return manager.save(playlist);
    } catch (error) {
      this.logger.error(`Xtream discovery failed: ${error.message}`);
      throw new PlaylistValidationException(error.message);
    }
  }
}
