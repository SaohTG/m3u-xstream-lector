import type { M3uParsedEntry } from './m3u-parser';

const movieExt = /\.(mp4|mkv|avi|m4v)(\?|$)/i;
const sxe = /(S(\d{1,2}))?(E(\d{1,2}))/i;

export type EntryKind = 'live'|'movie'|'series';

export function inferType(e: M3uParsedEntry): EntryKind {
  const group = (e.attributes['group-title'] || '').toLowerCase();
  const title = (e.title || '').toLowerCase();
  const url = e.url.toLowerCase();
  if (group.match(/vod|film|movie|cinéma/)) return 'movie';
  if (group.match(/series|séries|shows/)) return 'series';
  if (url.includes('/movie/') || movieExt.test(url)) return 'movie';
  if (url.includes('/series/') || sxe.test(title)) return 'series';
  return 'live';
}

// Helpers to extract season/episode from title like "Show S01E02"
export function extractSeasonEpisode(title: string): { season?: number; episode?: number } {
  const m = title.match(/S(\d{1,2})E(\d{1,2})/i);
  if (!m) return {};
  return { season: parseInt(m[1], 10), episode: parseInt(m[2], 10) };
}

export function normalizeSeriesTitle(title: string): string {
  return title.replace(/S\d{1,2}E\d{1,2}.*/i, '').trim();
}
