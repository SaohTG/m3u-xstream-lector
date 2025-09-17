export type PlaylistType = 'M3U' | 'XTREAM';

export interface BasePlaylist {
  id: string;
  userId: string; // Or a user object if you have user management
  type: PlaylistType;
  name?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface M3UPlaylist extends BasePlaylist {
  type: 'M3U';
  m3uUrl: string;
}

export interface XtreamPlaylist extends BasePlaylist {
  type: 'XTREAM';
  // The clean URL (e.g., http://my-host.com)
  url: string;
  // The actual discovered endpoint (e.g., http://my-host.com:8080)
  baseUrl: string;
  username: string;
  // Password is intentionally not included here for security
}

export type Playlist = M3UPlaylist | XtreamPlaylist;

// Generic item types
export interface BaseStreamItem {
  id: string; // For M3U, this is base64(url). For Xtream, it's the stream_id.
  title: string;
  logo?: string;
}

export interface LiveChannel extends BaseStreamItem {
  group: string;
  url: string; // The final, playable stream URL
}

export interface Movie extends BaseStreamItem {
  year?: number;
  rating?: number;
  streamUrl?: string; // Only available on detail view
}

export interface Series extends BaseStreamItem {
  year?: number;
  rating?: number;
  cover?: string;
}

export interface Episode extends BaseStreamItem {
  season: number;
  episode: number;
  streamUrl?: string; // Only available on detail view
}

// M3U specific types
export interface M3UAttributes {
  'tvg-id'?: string;
  'tvg-name'?: string;
  'tvg-logo'?: string;
  'group-title'?: string;
  [key: string]: string | undefined;
}

export interface M3UItem {
  title: string;
  url: string;
  attributes: M3UAttributes;
  raw: string;
}

export type M3UItemType = 'live' | 'movie' | 'series';

// Xtream specific types
export interface XtreamUserInfo {
  username: string;
  password?: string;
  message?: string;
  auth: number;
  status: 'Active' | 'Expired' | 'Banned' | 'Disabled';
  exp_date?: string;
  is_trial?: string;
  active_cons?: string;
  created_at?: string;
  max_connections?: string;
  allowed_output_formats: string[];
}

export interface XtreamServerInfo {
  url: string;
  port: string;
  https_port: string;
  server_protocol: 'http' | 'https';
  rtmp_port: string;
  timezone: string;
  timestamp_now: number;
  time_now: string;
}

export interface XtreamLiveCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface XtreamLiveStream {
  num: number;
  name: string;
  stream_type: 'live';
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string | null;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

export interface XtreamVodStream {
  num: number;
  name: string;
  stream_type: 'movie' | 'vod';
  stream_id: number;
  stream_icon: string;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string | null;
  rating: string;
  rating_5based: number;
  direct_source: string;
}

export interface XtreamSeriesStream {
    num: number;
    name: string;
    series_id: number;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    last_modified: string;
    rating: string;
    rating_5based: number;
    backdrop_path: string[];
    youtube_trailer: string;
    episode_run_time: string;
    category_id: string;
}

export interface XtreamVodInfo {
  info: {
    movie_image: string;
    name: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releasedate: string;
    rating: string;
    youtube_trailer: string;
    duration_secs: number;
    duration: string;
    bitrate: number;
  },
  movie_data: {
    stream_id: number;
    name: string;
    container_extension: string;
  }
}

export interface XtreamSeriesInfo {
    info: XtreamSeriesStream;
    episodes: {
        [season_number: string]: {
            id: string;
            episode_num: number;
            title: string;
            container_extension: string;
            info: {
                releasedate: string;
                plot: string;
                duration_secs: number;
                duration: string;
                movie_image: string;
                bitrate: number;
            };
            // ... other fields
        }[];
    };
}
