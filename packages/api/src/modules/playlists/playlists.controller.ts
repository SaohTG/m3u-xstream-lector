import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { PlaylistsService } from './playlists.service';
import { LinkM3uSchema, LinkXtreamSchema } from './dto/link-playlist.dto';

@Controller('api/playlists')
export class PlaylistsController {
  constructor(private svc: PlaylistsService) {}

  @Get('active')
  async active() {
    const p = await this.svc.active();
    if (!p) return { active: false };
    const { password, ...rest } = p as any;
    return { active: true, playlist: rest };
  }

  @Post('unlink')
  async unlink() {
    return await this.svc.unlink();
  }

  @Post('link')
  async link(@Body() body: any) {
    const t = (body?.type || '').toLowerCase();
    if (t === 'm3u') {
      const parsed = LinkM3uSchema.parse(body);
      const saved = await this.svc.linkM3U(parsed.url, parsed.name);
      const { password, ...rest } = saved as any;
      return rest;
    }
    if (t === 'xtream') {
      const parsed = LinkXtreamSchema.parse(body);
      const saved = await this.svc.linkXtream(parsed.base_url, parsed.username, parsed.password, parsed.name);
      const { password, ...rest } = saved as any;
      return rest;
    }
    throw new Error('Unknown type');
  }
}
