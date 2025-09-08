import { Body, Controller, Post } from '@nestjs/common';
import { PlaylistsService } from './playlists.service';

@Controller('playlists')
export class PlaylistsController {
  constructor(private svc: PlaylistsService) {}

  @Post('link')
  link(@Body() body: any) {
    // body: { type: 'M3U'|'XTREAM', url? baseUrl? username? password? }
    return this.svc.link(body);
  }
}
