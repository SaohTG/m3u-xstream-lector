import { Body, Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { LinkPlaylistDto } from './dto/link-playlist.dto';

@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Post('link')
  @HttpCode(HttpStatus.OK)
  async link(@Body() linkPlaylistDto: LinkPlaylistDto) {
    const playlist = await this.playlistsService.link(linkPlaylistDto, 'default_user');
    // Return a sanitized version of the playlist
    const { password, ...result } = playlist;
    return result;
  }

  @Post('unlink')
  @HttpCode(HttpStatus.OK)
  async unlink() {
    return this.playlistsService.unlink('default_user');
  }

  @Get('active')
  async getActive() {
    const playlist = await this.playlistsService.getActive('default_user');
    if (!playlist) {
      return null;
    }
    // Return a sanitized version of the playlist
    const { password, ...result } = playlist;
    return result;
  }
}
