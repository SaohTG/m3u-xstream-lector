export type M3UItem = {
  title: string;
  group?: string;
  tvgId?: string;
  tvgName?: string;
  tvgLogo?: string;
  url?: string;
};

export function parseM3U(content: string): M3UItem[] {
  const lines = content.split(/\r?\n/);
  const items: M3UItem[] = [];
  let current: Partial<M3UItem> = {};
  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      // Example: #EXTINF:-1 tvg-id="id" tvg-name="name" group-title="Movies" tvg-logo="...",
      const attrs = line.split(' ', 2)[1] || '';
      const getAttr = (name: string) => {
        const m = attrs.match(new RegExp(name + '="([^"]+)"'));
        return m ? m[1] : undefined;
      };
      current = {
        tvgId: getAttr('tvg-id'),
        tvgName: getAttr('tvg-name'),
        tvgLogo: getAttr('tvg-logo'),
        group: getAttr('group-title'),
      };
      const titleMatch = line.match(/,(.*)$/);
      if (titleMatch) current.title = titleMatch[1].trim();
    } else if (line && !line.startsWith('#')) {
      current.url = line.trim();
      if (current.title) items.push(current as M3UItem);
      current = {};
    }
  }
  return items;
}
