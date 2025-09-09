import { Body, Controller, Get, Post, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { LinkPlaylistDto } from './dto/link-playlist.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('playlists')
@UseGuards(JwtAuthGuard)
export class PlaylistsController {
  constructor(private readonly svc: PlaylistsService) {}

  @Post('link')
  async link(@Body() body: LinkPlaylistDto, @Req() req: any) {
    const userId = req.user?.userId as string | undefined;
    if (!userId) throw new UnauthorizedException('Utilisateur non authentifié');
    return this.svc.link(body, userId); // ✅ 2 arguments: dto + userId
  }

  @Get('me')
  async me(@Req() req: any) {
    const userId = req.user?.userId as string | undefined;
    if (!userId) throw new UnauthorizedException('Utilisateur non authentifié');
    const pl = await this.svc.getActiveForUser(userId);
    return { playlist: pl };
  }
}
