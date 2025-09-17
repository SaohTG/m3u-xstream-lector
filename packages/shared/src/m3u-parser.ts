export type M3uParsedEntry = { title: string; url: string; attributes: Record<string,string> };

export function parseM3U(text: string): M3uParsedEntry[] {
  const entries: M3uParsedEntry[] = [];
  const lines = text.split(/\r?\n/);
  if (!lines[0]?.startsWith('#EXTM3U')) throw new Error('Invalid M3U: missing #EXTM3U');

  let infoLine: string | null = null;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF')) {
      infoLine = line;
    } else if (!line.startsWith('#')) {
      // URL line
      const url = line;
      let title = url;
      const attributes: Record<string,string> = {};

      if (infoLine) {
        // #EXTINF:-1 tvg-id="..." tvg-name="..." tvg-logo="..." group-title="...", Title
        const attrPart = infoLine.substring(infoLine.indexOf(':') + 1);
        const parts = attrPart.split(',');
        if (parts.length > 1) {
          title = parts.slice(1).join(',').trim();
        }
        const attrRegex = /(\w+(?:-\w+)*)=\"([^\"]*)\"/g;
        let m: RegExpExecArray | null;
        while ((m = attrRegex.exec(attrPart)) !== null) {
          attributes[m[1]] = m[2];
        }
      }
      entries.push({ title, url, attributes });
      infoLine = null;
    }
  }
  return entries;
}
