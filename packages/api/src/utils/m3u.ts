export type M3UItem = {
  name: string;
  url: string;
  group?: string | null;
  logo?: string | null;
  tvgId?: string | null;
  attrs?: Record<string, string>;
};

const ATTR_RE = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
const SXXEXX_RE = /S\d{1,2}E\d{1,2}/i;

export function parseM3U(text: string): M3UItem[] {
  const out: M3UItem[] = [];
  const lines = text.split(/\r?\n/);
  let pending: Partial<M3UItem> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw) continue;
    const line = raw.trim();

    if (line.startsWith('#EXTINF')) {
      // ex: #EXTINF:-1 tvg-id="x" tvg-name="y" tvg-logo="..." group-title="Movies",The Matrix
      const attrs: Record<string, string> = {};
      let m: RegExpExecArray | null;
      while ((m = ATTR_RE.exec(line))) attrs[m[1].toLowerCase()] = m[2];

      const name = line.includes(',')
        ? line.substring(line.indexOf(',') + 1).trim()
        : (attrs['tvg-name'] || 'Untitled');

      pending = {
        name,
        group: attrs['group-title'] || null,
        logo: attrs['tvg-logo'] || null,
        tvgId: attrs['tvg-id'] || null,
        attrs,
      };
    } else if (!line.startsWith('#') && pending) {
      // URL
      const url = line;
      out.push({ ...(pending as any), url } as M3UItem);
      pending = null;
    }
  }
  return out;
}

function guessType(it: M3UItem): 'live' | 'movie' | 'series' {
  const g = (it.group || '').toLowerCase();
  const n = (it.name || '').toLowerCase();
  const u = (it.url || '').toLowerCase();

  // Heuristiques "series"
  if (SXXEXX_RE.test(n) || /\b(series|séries|season|epis|episode)\b/.test(g) || /\/series?\//.test(u)) {
    return 'series';
  }
  // Heuristiques "movie"
  if (/\b(film|movie|cinema|vod|pelicul|movies?)\b/.test(g) || /\/movie\//.test(u) || /\.(mp4|mkv|avi|mov)(\?|$)/.test(u)) {
    return 'movie';
  }
  // Cas live par défaut (m3u8/hls souvent live)
  return 'live';
}

export function classifyM3U(items: M3UItem[]) {
  const movies: M3UItem[] = [];
  const shows: M3UItem[] = [];
  const live: M3UItem[] = [];
  for (const it of items) {
    const t = guessType(it);
    if (t === 'movie') movies.push(it);
    else if (t === 'series') shows.push(it);
    else live.push(it);
  }
  return { movies, shows, live };
}
