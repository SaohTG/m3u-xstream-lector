import { Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { VodService } from './vod.service';

@Controller('vod')
@UseGuards(JwtAuthGuard)
export class VodController {
  constructor(private readonly vod: VodService) {}

  // ========= FILMS =========
  @Get('movies/rails')
  moviesRails(@Req() req: any) {
    return this.vod.getMovieRails(req.user.userId);
  }

  // alias rétro-compat
  @Get('movies/sections')
  moviesSections(@Req() req: any) {
    return this.vod.getMovieRails(req.user.userId);
  }

  // détails film (alias court)
  @Get('movies/:movieId')
  movieDetailsAlias(@Req() req: any, @Param('movieId') movieId: string) {
    return this.vod.getMovieDetails(req.user.userId, movieId);
  }

  // détails film (explicite)
  @Get('movies/:movieId/details')
  movieDetails(@Req() req: any, @Param('movieId') movieId: string) {
    return this.vod.getMovieDetails(req.user.userId, movieId);
  }

  // URL lecture film
  @Get('movies/:movieId/url')
  movieUrl(@Req() req: any, @Param('movieId') movieId: string) {
    return this.vod.getMovieStreamUrl(req.user.userId, movieId);
  }

  // ========= SÉRIES =========
  @Get('shows/rails')
  showsRails(@Req() req: any) {
    return this.vod.getShowRails(req.user.userId);
  }

  // alias rétro-compat
  @Get('shows/sections')
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

  // ========= TV (rails + URL directe optionnelle) =========
  @Get('live/rails')
  liveRails(@Req() req: any) {
    return this.vod.getLiveRails(req.user.userId);
  }

  // alias
  @Get('live/sections')
  liveSections(@Req() req: any) {
    return this.vod.getLiveRails(req.user.userId);
  }

  // URL directe (rarement utilisée si on passe par le proxy HLS)
  @Get('live/:streamId/url')
  liveUrl(@Req() req: any, @Param('streamId') streamId: string) {
    return this.vod.getLiveStreamUrl(req.user.userId, streamId);
  }

  // ========= TV : PROXY HLS anti-CORS =========

  // Manifeste réécrit (.m3u8)
  @Get('live/:streamId/hls.m3u8')
  async liveHlsManifest(@Req() req: any, @Param('streamId') streamId: string, @Res() res: any) {
    const text = await this.vod.getLiveHlsManifest(req.user.userId, streamId);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(text);
  }

  // Segment/playlist ABSOLU (si le manifeste référence des URLs http(s))
  @Get('live/:streamId/hls/seg')
  async liveHlsSegAbs(@Req() req: any, @Param('streamId') streamId: string, @Query('u') u: string, @Res() res: any) {
    await this.vod.pipeLiveAbsoluteSegment(req.user.userId, streamId, u, res);
  }

  // Segment/playlist RELATIF avec chemins imbriqués (ex. 720p/seg-001.ts)
  @Get('live/:streamId/hls/:assetPath(*)')
  async liveHlsSegRelWildcard(
    @Req() req: any,
    @Param('streamId') streamId: string,
    @Param('assetPath') assetPath: string,
    @Res() res: any,
  ) {
    await this.vod.pipeLiveRelativePath(req.user.userId, streamId, assetPath, res);
  }
}
