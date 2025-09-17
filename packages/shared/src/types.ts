export type M3uEntry = {
  title: string;
  url: string;
  attributes: Record<string, string>;
};

export type LiveChannel = {
  id: string;
  title: string;
  logo?: string;
  group?: string;
  url: string;
};

export type MovieItem = {
  id: string;
  title: string;
  poster?: string;
  group?: string;
  streamUrl: string;
};

export type SeriesEpisode = {
  id: string;
  title: string;
  season?: number;
  episode?: number;
  streamUrl: string;
};

export type SeriesItem = {
  id: string;
  title: string;
  poster?: string;
  seasons: Record<number, SeriesEpisode[]>;
};

export type PlaylistType = "M3U" | "XTREAM";
