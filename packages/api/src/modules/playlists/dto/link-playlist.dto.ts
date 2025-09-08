import { IsIn, IsString, IsUrl, ValidateIf } from 'class-validator';

export class LinkPlaylistDto {
  @IsIn(['M3U','XTREAM'])
  type!: 'M3U'|'XTREAM';

  @ValidateIf(o => o.type === 'M3U')
  @IsUrl({ require_tld: false })
  url?: string;

  @ValidateIf(o => o.type === 'XTREAM')
  @IsUrl({ require_tld: false })
  baseUrl?: string;

  @ValidateIf(o => o.type === 'XTREAM')
  @IsString()
  username?: string;

  @ValidateIf(o => o.type === 'XTREAM')
  @IsString()
  password?: string;
}
