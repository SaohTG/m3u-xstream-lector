import { Body, Controller, Get, Post, Delete, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PlaylistsService } from './playlists.service';
import { LinkPlaylistDto } from './dto/link-playlist.dto';

@UseGuards(JwtAuthGuard)
@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly svc: PlaylistsService) {}

  @Get('me')
  async me(@Req() req: Request) {
    const uid = (req as any)?.user?.id || (req as any)?.user?.sub;
    if (!uid) throw new UnauthorizedException('Missing user id');
    return this.svc.getForUser(uid);
  }

  @Post('link')
  async link(@Req() req: Request, @Body() dto: LinkPlaylistDto) {
    const uid = (req as any)?.user?.id || (req as any)?.user?.sub;
    if (!uid) throw new UnauthorizedException('Missing user id');
    return this.svc.link(uid, dto);
  }

  @Delete('unlink')
  async unlink(@Req() req: Request) {
    const uid = (req as any)?.user?.id || (req as any)?.user?.sub;
    if (!uid) throw new UnauthorizedException('Missing user id');
    return this.svc.unlink(uid);
  }
}
