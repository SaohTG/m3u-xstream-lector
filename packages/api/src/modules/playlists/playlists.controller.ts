import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PlaylistsService } from './playlists.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('playlists')
@UseGuards(JwtAuthGuard)
export class PlaylistsController {
  constructor(private readonly svc: PlaylistsService) {}

  @Get('me')
  async me(@Req() req: Request) {
    const user: any = req.user;
    const list = await this.svc.getForUser(user.id);
    const active = await this.svc.getActiveForUser(user.id);
    return {
      activeId: active?.id ?? null,
      items: list,
    };
  }

  @Post('link')
  async link(@Req() req: Request, @Body() dto: any) {
    const user: any = req.user;
    // dto peut être { type:'M3U', url } ou { type:'XTREAM', host, username, password }
    await this.svc.link(user.id, dto);
    return { ok: true };
  }

  @Post('unlink')
  async unlink(@Req() req: Request) {
    const user: any = req.user;
    await this.svc.unlink(user.id);
    return { ok: true };
  }
}
