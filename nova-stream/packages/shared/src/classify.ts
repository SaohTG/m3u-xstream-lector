import { M3UItem, M3UItemType } from './types';

const MOVIE_KEYWORDS = ['vod', 'film', 'movie', 'cinéma', 'movies'];
const SERIES_KEYWORDS = ['series', 'séries', 'shows', 'tv shows'];
const MOVIE_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.m4v'];
const SERIES_REGEX = /S\d{1,2}E\d{1,2}/i;
const YEAR_REGEX = /\(\d{4}\)/;
const URL_MOVIE_REGEX = /\/movie\//i;
const URL_SERIES_REGEX = /\/series\//i;

/**
 * Infers the type of content (live, movie, or series) from an M3U item.
 * @param item The M3U item to classify.
 * @returns The inferred type.
 */
export function inferM3UItemType(item: M3UItem): M3UItemType {
  const groupTitle = item.attributes['group-title']?.toLowerCase() || '';
  const title = item.title.toLowerCase();
  const url = item.url.toLowerCase();

  // Heuristic 1: group-title keywords
  if (SERIES_KEYWORDS.some(kw => groupTitle.includes(kw))) {
    return 'series';
  }
  if (MOVIE_KEYWORDS.some(kw => groupTitle.includes(kw))) {
    return 'movie';
  }

  // Heuristic 2: SxxEyy pattern in title
  if (SERIES_REGEX.test(item.title)) {
    return 'series';
  }

  // Heuristic 3: URL patterns
  if (URL_SERIES_REGEX.test(url)) {
    return 'series';
  }
  if (URL_MOVIE_REGEX.test(url)) {
    return 'movie';
  }

  // Heuristic 4: File extensions
  if (MOVIE_EXTENSIONS.some(ext => url.endsWith(ext))) {
    // Could be movie or series, we need more info.
    // If we're here, group-title didn't give a hint.
    // We'll assume movie by default, but SxxEyy pattern already handled series.
    return 'movie';
  }

  // Default to live TV
  return 'live';
}

/**
 * Normalizes a series title by removing season/episode info and year.
 * e.g., "My Show (2023) S01E02" -> "My Show"
 * @param title The original title.
 * @returns The normalized title.
 */
export function normalizeSeriesTitle(title: string): string {
  return title
    .replace(SERIES_REGEX, '')
    .replace(YEAR_REGEX, '')
    .trim()
    .replace(/[-|]$/, '') // Remove trailing separators
    .trim();
}

/**
 * Generates a URL-safe Base64 encoded ID.
 * @param input The string to encode.
 * @returns A URL-safe Base64 string.
 */
function toUrlSafeBase64(input: string): string {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}


/**
 * Generates a unique ID for an M3U movie or episode item.
 * @param url The stream URL.
 * @returns A base64 encoded ID.
 */
export function generateM3UItemId(url: string): string {
  return toUrlSafeBase64(url);
}

/**
 * Generates a unique ID for a series based on its normalized title.
 * @param normalizedTitle The title after removing season/episode info.
 * @returns A base64 encoded ID.
 */
export function generateM3USeriesId(normalizedTitle: string): string {
  return toUrlSafeBase64(normalizedTitle);
}

/**
 * Extracts season and episode numbers from a title.
 * @param title The title containing SxxEyy pattern.
 * @returns An object with season and episode numbers, or null.
 */
export function extractSeasonAndEpisode(title: string): { season: number; episode: number } | null {
    const match = title.match(/S(\d{1,2})E(\d{1,2})/i);
    if (match) {
        return {
            season: parseInt(match[1], 10),
            episode: parseInt(match[2], 10),
        };
    }
    return null;
}
