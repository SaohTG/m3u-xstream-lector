import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';

export class LinkPlaylistDto {
  // "m3u" ou "xtream"
  @IsIn(['m3u', 'xtream'])
  type!: 'm3u' | 'xtream';

  // nom libre (optionnel)
  @IsOptional()
  @IsString()
  name?: string;

  // --- Variante M3U ---
  @ValidateIf(o => o.type === 'm3u')
  @IsUrl({ require_tld: false }) // autorise IP/ports
  m3u_url?: string;

  // Back-compat : certains fronts envoient "url"
  @ValidateIf(o => o.type === 'm3u' && !o.m3u_url)
  @IsUrl({ require_tld: false })
  url?: string;

  // --- Variante Xtream ---
  @ValidateIf(o => o.type === 'xtream')
  @IsUrl({ require_tld: false })
  base_url?: string;

  @ValidateIf(o => o.type === 'xtream')
  @IsString()
  username?: string;

  @ValidateIf(o => o.type === 'xtream')
  @IsString()
  password?: string;
}
