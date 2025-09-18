import { PlaylistType } from '@novastream/shared';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';

export class LinkPlaylistDto {
  @IsEnum(['M3U', 'XTREAM'])
  @IsNotEmpty()
  type: PlaylistType;

  @IsString()
  @IsOptional()
  name?: string;

  // M3U fields
  @ValidateIf((o) => o.type === 'M3U')
  @IsUrl({ require_protocol: true })
  @IsNotEmpty()
  url: string;

  // Xtream fields
  @ValidateIf((o) => o.type === 'XTREAM')
  @IsString()
  @IsNotEmpty()
  host: string;

  @ValidateIf((o) => o.type === 'XTREAM')
  @IsString()
  @IsNotEmpty()
  username: string;

  @ValidateIf((o) => o.type === 'XTREAM')
  @IsString()
  @IsNotEmpty()
  password: string;
}
