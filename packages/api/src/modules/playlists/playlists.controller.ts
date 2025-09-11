import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PlaylistsService } from './playlists.service';
import { LinkPlaylistDto } from './dto/link-playlist.dto';

@Controller('playlists')
@UseGuards(JwtAuthGuard)
export class PlaylistsController {
  constructor(private readonly playlists: PlaylistsService) {}

  @Get('me')
  async me(@Req() req: any) {
    return this.playlists.getForUser(req.user.sub);
  }

  @Post('link')
  async link(@Req() req: any, @Body() dto: LinkPlaylistDto) {
    return this.playlists.link(req.user.sub, dto);
  }

  @Delete('unlink')
  async unlink(@Req() req: any) {
    return this.playlists.unlink(req.user.sub);
  }
}
