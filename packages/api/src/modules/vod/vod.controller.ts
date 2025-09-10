import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { VodService } from './vod.service';

@Controller('vod')
@UseGuards(JwtAuthGuard)
export class VodController {
  constructor(private readonly vod: VodService) {}

  // ---------- FILMS ----------
  @Get('movies/rails')
  moviesRails(@Req() req: any) {
    return this.vod.getMovieRails(req.user.userId);
  }

  // Alias rétro-compat (certains fronts appellent /sections)
  @Get('movies/sections')
  moviesSections(@Req() req: any) {
    return this.vod.getMovieRails(req.user.userId);
  }

  // ---------- SÉRIES ----------
  @Get('shows/rails')
  showsRails(@Req() req: any) {
    return this.vod.getShowRails(req.user.userId);
  }

  // Alias rétro-compat
  @Get('shows/sections')
  showsSections(@Req() req: any) {
    return this.vod.getShowRails(req.user.userId);
  }

  // Détails d'une série (titre, description, note, poster, etc.)
  @Get('shows/:seriesId/details')
  showDetails(@Req() req: any, @Param('seriesId') seriesId: string) {
    return this.vod.getSeriesDetails(req.user.userId, seriesId);
  }

  // Saisons et épisodes d'une série
  @Get('shows/:seriesId/seasons')
  showSeasons(@Req() req: any, @Param('seriesId') seriesId: string) {
    return this.vod.getSeriesSeasons(req.user.userId, seriesId);
  }

  // URL de lecture d'un épisode (pour le lecteur web)
  @Get('episodes/:episodeId/url')
  episodeUrl(@Req() req: any, @Param('episodeId') episodeId: string) {
    return this.vod.getEpisodeStreamUrl(req.user.userId, episodeId);
  }

  // ---------- TV EN DIRECT ----------
  @Get('live/rails')
  liveRails(@Req() req: any) {
    return this.vod.getLiveRails(req.user.userId);
  }

  // Alias rétro-compat
  @Get('live/sections')
  liveSections(@Req() req: any) {
    return this.vod.getLiveRails(req.user.userId);
  }
}
