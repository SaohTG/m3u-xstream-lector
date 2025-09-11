import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { VodService } from './vod.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('vod')
@UseGuards(JwtAuthGuard)
export class VodController {
  constructor(private readonly vod: VodService) {}

  // ---- MOVIES (films) ----
  @Get(['movies/rails', 'films/rails'])
  async movieRails(@Req() req: any) {
    return this.vod.getMovieRails(req.user.sub);
  }

  @Get(['movies/:id', 'films/:id'])
  async movieDetails(@Req() req: any, @Param('id') id: string) {
    return this.vod.getMovieDetails(req.user.sub, id);
  }

  @Get(['movies/:id/stream', 'films/:id/stream'])
  async movieStream(@Req() req: any, @Param('id') id: string) {
    return this.vod.getMovieStreamUrl(req.user.sub, id);
  }

  // ---- SHOWS (series) ----
  @Get(['shows/rails', 'series/rails'])
  async showRails(@Req() req: any) {
    return this.vod.getShowRails(req.user.sub);
  }

  @Get(['shows/:id', 'series/:id'])
  async seriesDetails(@Req() req: any, @Param('id') id: string) {
    return this.vod.getSeriesDetails(req.user.sub, id);
  }

  @Get(['shows/:id/seasons', 'series/:id/seasons'])
  async seriesSeasons(@Req() req: any, @Param('id') id: string) {
    return this.vod.getSeriesSeasons(req.user.sub, id);
  }

  @Get(['shows/:sid/episodes/:eid/stream', 'series/:sid/episodes/:eid/stream'])
  async episodeStream(@Req() req: any, @Param('sid') sid: string, @Param('eid') eid: string) {
    return this.vod.getEpisodeStreamUrl(req.user.sub, sid, eid);
  }

  // ---- LIVE (tv) ----
  @Get(['live/rails', 'tv/rails'])
  async liveRails(@Req() req: any) {
    return this.vod.getLiveRails(req.user.sub);
  }

  // HLS proxy (si tu l'utilises côté front)
  @Get('live/:chan/hls/master')
  async liveMaster(@Req() req: any, @Param('chan') chan: string, @Query() q: any) {
    return this.vod.getLiveMasterM3U8(req.user.sub, chan, q);
  }

  @Get('live/:chan/hls/seg')
  async liveSeg(@Req() req: any, @Param('chan') chan: string, @Query() q: any) {
    return this.vod.getLiveSegment(req.user.sub, chan, q);
  }
}
