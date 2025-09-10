import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { VodService } from './vod.service';

@Controller('vod')
@UseGuards(JwtAuthGuard)
export class VodController {
  constructor(private readonly vod: VodService) {}

  // --- Rails existants (si tu les as déjà, garde-les) ---
  @Get('movies/rails')
  moviesRails(@Req() req: any) {
    return this.vod.getMovieRails(req.user.userId);
  }

  @Get('shows/rails')
  showsRails(@Req() req: any) {
    return this.vod.getShowRails(req.user.userId);
  }

  @Get('live/rails')
  liveRails(@Req() req: any) {
    return this.vod.getLiveRails(req.user.userId);
  }

  // --- NOUVEAU : Détails d'une série + saisons/épisodes ---
  @Get('shows/:seriesId/details')
  showDetails(@Req() req: any, @Param('seriesId') seriesId: string) {
    return this.vod.getSeriesDetails(req.user.userId, seriesId);
  }

  @Get('shows/:seriesId/seasons')
  showSeasons(@Req() req: any, @Param('seriesId') seriesId: string) {
    return this.vod.getSeriesSeasons(req.user.userId, seriesId);
  }

  // --- NOUVEAU : URL de lecture d'un épisode ---
  @Get('episodes/:episodeId/url')
  episodeUrl(@Req() req: any, @Param('episodeId') episodeId: string) {
    return this.vod.getEpisodeStreamUrl(req.user.userId, episodeId);
  }
}
