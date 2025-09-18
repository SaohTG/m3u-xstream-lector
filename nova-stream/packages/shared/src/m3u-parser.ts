import { M3UItem, M3UAttributes } from './types';

const ATTRIBUTE_REGEX = /([a-zA-Z0-9_-]+)="([^"]*)"/g;

/**
 * Parses the attributes string from an #EXTINF line.
 * @param line The part of the #EXTINF line after the comma.
 * @returns A record of key-value attributes.
 */
function parseAttributes(line: string): { title: string; attributes: M3UAttributes } {
  const attributes: M3UAttributes = {};
  let title = line;

  let match;
  while ((match = ATTRIBUTE_REGEX.exec(line)) !== null) {
    attributes[match[1]] = match[2];
  }

  // The title is the part before the first attribute
  const firstAttributeIndex = line.search(ATTRIBUTE_REGEX);
  if (firstAttributeIndex !== -1) {
    title = line.substring(0, firstAttributeIndex).trim();
  }

  return { title, attributes };
}

/**
 * Parses the content of an M3U playlist file.
 * @param content The string content of the M3U file.
 * @returns An array of M3U items found in the playlist.
 */
export function parseM3U(content: string): M3UItem[] {
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  const lines = content.split(/\r?\n/);
  const items: M3UItem[] = [];

  if (lines.length === 0 || !lines[0].startsWith('#EXTM3U')) {
    console.warn('M3U content does not start with #EXTM3U header.');
    // We can still try to parse it
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      const infoLine = line;
      const urlLine = lines[++i]?.trim();

      if (!urlLine || urlLine.startsWith('#')) {
        // Invalid entry, URL is missing or is another tag
        continue;
      }

      const commaIndex = infoLine.indexOf(',');
      if (commaIndex === -1) {
        continue;
      }

      const attributePart = infoLine.substring(commaIndex + 1);
      const { title, attributes } = parseAttributes(attributePart);

      items.push({
        title,
        url: urlLine,
        attributes,
        raw: `${infoLine}\n${urlLine}`,
      });
    }
  }

  return items;
}

/**
 * Checks if an M3U playlist is valid and not empty.
 * @param content The string content of the M3U file.
 * @returns True if the playlist has a header and at least one item.
 */
export function validateM3U(content: string): boolean {
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    const lines = content.split('\n').map(l => l.trim());

    const hasHeader = lines[0].startsWith('#EXTM3U');
    const hasItem = lines.some(line => line.startsWith('#EXTINF:'));

    return hasHeader && hasItem;
}
