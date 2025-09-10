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
  @Get('movies/sections') // alias rétro-compat
  moviesSections(@Req() req: any) {
    return this.vod.getMovieRails(req.user.userId);
  }
  @Get('movies/:movieId') // détails film (alias court)
  movieDetailsAlias(@Req() req: any, @Param('movieId') movieId: string) {
    return this.vod.getMovieDetails(req.user.userId, movieId);
  }
  @Get('movies/:movieId/details') // détails film explicite
  movieDetails(@Req() req: any, @Param('movieId') movieId: string) {
    return this.vod.getMovieDetails(req.user.userId, movieId);
  }
  @Get('movies/:movieId/url') // URL de lecture film
  movieUrl(@Req() req: any, @Param('movieId') movieId: string) {
    return this.vod.getMovieStreamUrl(req.user.userId, movieId);
  }

  // ---------- SÉRIES ----------
  @Get('shows/rails')
  showsRails(@Req() req: any) {
    return this.vod.getShowRails(req.user.userId);
  }
  @Get('shows/sections') // alias rétro-compat
  showsSections(@Req() req: any) {
    return this.vod.getShowRails(req.user.userId);
  }
  @Get('shows/:seriesId/details')
  showDetails(@Req() req: any, @Param('seriesId') seriesId: string) {
    return this.vod.getSeriesDetails(req.user.userId, seriesId);
  }
  @Get('shows/:seriesId/seasons')
  showSeasons(@Req() req: any, @Param('seriesId') seriesId: string) {
    return this.vod.getSeriesSeasons(req.user.userId, seriesId);
  }
  @Get('episodes/:episodeId/url')
  episodeUrl(@Req() req: any, @Param('episodeId') episodeId: string) {
    return this.vod.getEpisodeStreamUrl(req.user.userId, episodeId);
  }

  // ---------- TV (Live) ----------
  @Get('live/rails')
  liveRails(@Req() req: any) {
    return this.vod.getLiveRails(req.user.userId);
  }
  @Get('live/sections') // alias rétro-compat
  liveSections(@Req() req: any) {
    return this.vod.getLiveRails(req.user.userId);
  }
  @Get('live/:streamId/url') // ✅ URL de lecture de chaîne
  liveUrl(@Req() req: any, @Param('streamId') streamId: string) {
    return this.vod.getLiveStreamUrl(req.user.userId, streamId);
  }
}
