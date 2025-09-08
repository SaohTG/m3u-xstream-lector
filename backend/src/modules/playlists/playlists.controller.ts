import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsString, IsUrl } from 'class-validator';
import { JwtGuard } from '../auth/jwt.guard';
import { PlaylistsService } from './playlists.service';

class ParseM3UDto {
  @IsString() @IsUrl()
  url!: string;
}
class XtreamConnectDto {
  @IsString() baseUrl!: string;
  @IsString() username!: string;
  @IsString() password!: string;
}

@Controller('playlists')
@UseGuards(JwtGuard)
export class PlaylistsController {
  constructor(private svc: PlaylistsService) {}

  @Post('parse-m3u')
  parseM3U(@Body() dto: ParseM3UDto) {
    return this.svc.parseM3U(dto.url);
  }

  @Post('xtream/connect')
  xtreamConnect(@Body() dto: XtreamConnectDto) {
    return this.svc.xtreamConnect(dto.baseUrl, dto.username, dto.password);
  }
}
