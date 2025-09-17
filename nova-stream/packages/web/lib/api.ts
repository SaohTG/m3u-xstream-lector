import { LinkPlaylistDto } from '@/modules/playlists/dto/link-playlist.dto';
import { LiveChannel, Movie, Playlist, Series } from '@novastream/shared';
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

// --- Playlists ---
export const getActivePlaylist = async (): Promise<Playlist | null> => {
  const { data } = await api.get('/playlists/active');
  return data || null;
};

export const linkPlaylist = async (dto: LinkPlaylistDto): Promise<Playlist> => {
  const { data } = await api.post('/playlists/link', dto);
  return data;
};

export const unlinkPlaylist = async (): Promise<{ success: boolean }> => {
  const { data } = await api.post('/playlists/unlink');
  return data;
};

// --- Live TV ---
export const getLiveChannels = async (): Promise<LiveChannel[]> => {
  const { data } = await api.get('/live/channels');
  return data;
};

// --- VOD ---
export const getMovies = async (): Promise<Movie[]> => {
    const { data } = await api.get('/vod/movies');
    return data;
}

export const getSeries = async (): Promise<Series[]> => {
    const { data } = await api.get('/vod/series');
    return data;
}

export const getMovieDetails = async (id: string): Promise<Movie> => {
    const { data } = await api.get(`/vod/movies/${id}`);
    return data;
}

export const getSeriesDetails = async (id: string): Promise<Series & {episodes: any[]}> => {
    const { data } = await api.get(`/vod/series/${id}/episodes`);
    const details = await api.get(`/vod/series/${id}`);
    return { ...details.data, episodes: data };
}

export const getStreamUrl = async (type: 'movie' | 'series', contentId: string, episodeId?: string): Promise<{url: string}> => {
    let url = '';
    if (type === 'movie') {
        url = `/vod/movies/${contentId}/stream`;
    } else {
        url = `/vod/series/${contentId}/episodes/${episodeId}/stream`;
    }
    const { data } = await api.get(url);
    return data;
}

export default api;
