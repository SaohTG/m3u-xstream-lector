import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PlaylistsService } from '../playlists/playlists.service';
import { HttpService } from '../../common/http';
import { Playlist } from '../playlists/playlist.entity';
import {
  Movie,
  Series,
  Episode,
  parseM3U,
  inferM3UItemType,
  normalizeSeriesTitle,
  generateM3UItemId,
  generateM3USeriesId,
  extractSeasonAndEpisode,
  XtreamVodStream,
  XtreamVodInfo,
  buildXtreamMovieUrl,
  XtreamSeriesStream,
  XtreamSeriesInfo,
  buildXtreamSeriesUrl,
} from '@novastream/shared';
import { PlaylistNotFoundException, StreamNotFoundException } from '../../common/errors';
import { AxiosInstance } from 'axios';

interface M3UVodCollection {
  movies: Movie[];
  series: Map<string, Series & { episodes: Episode[] }>;
}

// A version of the collection that is JSON-serializable for caching
interface SerializableM3UVodCollection {
    movies: Movie[];
    series: [string, Series & { episodes: Episode[] }][];
}

@Injectable()
export class VodService {
  private readonly logger = new Logger(VodService.name);
  private readonly axios: AxiosInstance;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly playlistsService: PlaylistsService,
    private readonly httpService: HttpService,
  ) {
    this.axios = this.httpService.getInstance();
  }

  // --- Movies ---

  async getAllMovies(userId: string): Promise<Movie[]> {
    const playlist = await this.playlistsService.getActiveWithPassword(userId);
    if (!playlist) throw new PlaylistNotFoundException();
    if (playlist.type === 'M3U') {
      const vod = await this.getM3UVod(playlist);
      return vod.movies;
    }
    return this.getXtreamMovies(playlist);
  }

  async getMovieDetails(userId: string, movieId: string): Promise<Movie> {
    const playlist = await this.playlistsService.getActiveWithPassword(userId);
    if (!playlist) throw new PlaylistNotFoundException();
    if (playlist.type === 'M3U') {
      const vod = await this.getM3UVod(playlist);
      const movie = vod.movies.find(m => m.id === movieId);
      if (!movie) throw new StreamNotFoundException('Movie not found');
      return { ...movie, streamUrl: (movie as any).url };
    }
    return this.getXtreamMovieDetails(playlist, movieId);
  }

  async getMovieStreamInfo(userId: string, movieId: string): Promise<{ url: string }> {
    const movie = await this.getMovieDetails(userId, movieId);
    if (!movie.streamUrl) throw new StreamNotFoundException('Stream URL not available');
    return { url: movie.streamUrl };
  }

  async getMovieRails(userId: string) {
    const movies = await this.getAllMovies(userId);
    return [{ title: 'Recently Added Movies', items: movies.slice(0, 20) }];
  }


  // --- Series ---

  async getAllSeries(userId: string): Promise<Series[]> {
    const playlist = await this.playlistsService.getActiveWithPassword(userId);
    if (!playlist) throw new PlaylistNotFoundException();
    if (playlist.type === 'M3U') {
      const vod = await this.getM3UVod(playlist);
      return Array.from(vod.series.values());
    }
    return this.getXtreamSeries(playlist);
  }

  async getSeriesDetails(userId: string, seriesId: string): Promise<Series> {
    const playlist = await this.playlistsService.getActiveWithPassword(userId);
    if (!playlist) throw new PlaylistNotFoundException();
     if (playlist.type === 'M3U') {
        const vod = await this.getM3UVod(playlist);
        const series = vod.series.get(seriesId);
        if (!series) throw new StreamNotFoundException('Series not found');
        return series;
    }
    return this.getXtreamSeriesDetails(playlist, seriesId);
  }

  async getSeriesEpisodes(userId: string, seriesId: string): Promise<Episode[]> {
    const playlist = await this.playlistsService.getActiveWithPassword(userId);
    if (!playlist) throw new PlaylistNotFoundException();
    if (playlist.type === 'M3U') {
      const vod = await this.getM3UVod(playlist);
      const series = vod.series.get(seriesId);
      if (!series) throw new StreamNotFoundException('Series not found');
      return series.episodes;
    }
    const seriesInfo = await this.getXtreamSeriesDetails(playlist, seriesId);
    return (seriesInfo as any).episodes || [];
  }

  async getEpisodeStreamInfo(userId: string, seriesId: string, episodeId: string): Promise<{ url: string }> {
    const playlist = await this.playlistsService.getActiveWithPassword(userId);
    if (!playlist) throw new PlaylistNotFoundException();
    if (playlist.type === 'M3U') {
        const vod = await this.getM3UVod(playlist);
        const series = vod.series.get(seriesId);
        const episode = series?.episodes.find(e => e.id === episodeId);
        if (!(episode as any)?.url) throw new StreamNotFoundException('Episode not found');
        return { url: (episode as any).url };
    }
    const seriesInfo = await this.getXtreamSeriesDetails(playlist, seriesId);
    const episode = ((seriesInfo as any).episodes || []).find(e => e.id === episodeId);
    if (!episode?.streamUrl) throw new StreamNotFoundException('Episode stream URL not available');
    return { url: episode.streamUrl };
  }

  async getSeriesRails(userId: string) {
    const series = await this.getAllSeries(userId);
    return [{ title: 'Popular Series', items: series.slice(0, 20) }];
  }

  // --- M3U Implementation ---

  private async getM3UVod(playlist: Playlist): Promise<M3UVodCollection> {
    const cacheKey = `m3u-vod:${playlist.m3uUrl}`;
    const cachedData = await this.cacheManager.get<SerializableM3UVodCollection>(cacheKey);

    if (cachedData) {
        this.logger.log(`[Cache HIT] Returning VOD collection from cache for ${playlist.m3uUrl}`);
        return {
            movies: cachedData.movies,
            series: new Map(cachedData.series),
        };
    }

    this.logger.log(`[Cache MISS] Parsing full M3U for VOD for ${playlist.m3uUrl}`);
    const { data: content } = await this.axios.get(playlist.m3uUrl, { responseType: 'text' });
    const items = parseM3U(content);

    const collection: M3UVodCollection = { movies: [], series: new Map() };

    for (const item of items) {
      const type = inferM3UItemType(item);
      if (type === 'movie') {
        collection.movies.push({
          id: generateM3UItemId(item.url),
          title: item.title,
          logo: item.attributes['tvg-logo'],
          url: item.url,
        } as any);
      } else if (type === 'series') {
        const normalizedTitle = normalizeSeriesTitle(item.title);
        const seriesId = generateM3USeriesId(normalizedTitle);

        if (!collection.series.has(seriesId)) {
          collection.series.set(seriesId, {
            id: seriesId,
            title: normalizedTitle,
            logo: item.attributes['tvg-logo'],
            episodes: [],
          });
        }

        const seriesData = collection.series.get(seriesId);
        const se = extractSeasonAndEpisode(item.title);
        seriesData.episodes.push({
            id: generateM3UItemId(item.url),
            title: item.title,
            logo: item.attributes['tvg-logo'],
            season: se?.season || 1,
            episode: se?.episode || 0,
            url: item.url,
        });
      }
    }

    // Store in cache
    const serializableCollection: SerializableM3UVodCollection = {
        movies: collection.movies,
        series: Array.from(collection.series.entries()),
    };
    await this.cacheManager.set(cacheKey, serializableCollection);

    return collection;
  }

  // --- Xtream Implementation ---

  private async getXtreamMovies(playlist: Playlist): Promise<Movie[]> {
    const { data } = await this.axios.get<XtreamVodStream[]>(`${playlist.baseUrl}/player_api.php`, {
        params: { username: playlist.username, password: playlist.password, action: 'get_vod_streams' },
    });
    return (data || []).map(m => ({
        id: String(m.stream_id),
        title: m.name,
        logo: m.stream_icon,
        rating: m.rating_5based,
    }));
  }

  private async getXtreamMovieDetails(playlist: Playlist, movieId: string): Promise<Movie> {
    const { data } = await this.axios.get<XtreamVodInfo>(`${playlist.baseUrl}/player_api.php`, {
        params: { username: playlist.username, password: playlist.password, action: 'get_vod_info', vod_id: movieId },
    });
    if (!data?.movie_data) throw new StreamNotFoundException('Movie not found on Xtream');
    const { info, movie_data } = data;
    return {
        id: String(movie_data.stream_id),
        title: info.name || movie_data.name,
        logo: info.movie_image,
        plot: info.plot,
        year: new Date(info.releasedate).getFullYear(),
        rating: Number(info.rating),
        streamUrl: buildXtreamMovieUrl(playlist.baseUrl, playlist.username, playlist.password, movie_data.stream_id, movie_data.container_extension),
    };
  }

  private async getXtreamSeries(playlist: Playlist): Promise<Series[]> {
    const { data } = await this.axios.get<XtreamSeriesStream[]>(`${playlist.baseUrl}/player_api.php`, {
        params: { username: playlist.username, password: playlist.password, action: 'get_series' },
    });
    return (data || []).map(s => ({
        id: String(s.series_id),
        title: s.name,
        logo: s.cover,
        rating: s.rating_5based,
        year: new Date(s.releaseDate).getFullYear(),
    }));
  }

  private async getXtreamSeriesDetails(playlist: Playlist, seriesId: string): Promise<Series & { episodes: Episode[] }> {
    const { data } = await this.axios.get<XtreamSeriesInfo>(`${playlist.baseUrl}/player_api.php`, {
        params: { username: playlist.username, password: playlist.password, action: 'get_series_info', series_id: seriesId },
    });
    if (!data?.info || !data?.episodes) throw new StreamNotFoundException('Series not found on Xtream');

    const episodes: Episode[] = [];
    for (const seasonNum in data.episodes) {
        for (const ep of data.episodes[seasonNum]) {
            episodes.push({
                id: ep.id,
                title: ep.title,
                season: Number(seasonNum),
                episode: ep.episode_num,
                logo: ep.info.movie_image,
                streamUrl: buildXtreamSeriesUrl(playlist.baseUrl, playlist.username, playlist.password, Number(ep.id), ep.container_extension),
            });
        }
    }

    return {
        id: String(data.info.series_id),
        title: data.info.name,
        logo: data.info.cover,
        plot: data.info.plot,
        rating: data.info.rating_5based,
        year: new Date(data.info.releaseDate).getFullYear(),
        episodes,
    };
  }
}
