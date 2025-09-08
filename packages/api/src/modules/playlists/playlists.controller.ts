import { Body, Controller, Post } from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { LinkPlaylistDto } from './dto/link-playlist.dto';

@Controller('playlists')
export class PlaylistsController {
  constructor(private svc: PlaylistsService) {}

  @Post('link')
  link(@Body() body: LinkPlaylistDto) {
    return this.svc.link(body);
  }
}
