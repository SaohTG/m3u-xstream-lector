import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PlaylistsService } from './playlists.service';

type LinkDto =
  | { type: 'M3U'; url: string }
  | { type: 'XTREAM'; base_url: string; username: string; password: string };

@Controller('playlists')
@UseGuards(JwtAuthGuard)
export class PlaylistsController {
  constructor(private svc: PlaylistsService) {}

  @Get('me')
  me(@Req() req: any) {
    return this.svc.me(req.user.userId);
  }

  @Post('link')
  link(@Req() req: any, @Body() dto: LinkDto) {
    return this.svc.link(req.user.userId, dto);
  }

  @Delete('unlink')
  unlink(@Req() req: any) {
    return this.svc.unlink(req.user.userId);
  }
}
