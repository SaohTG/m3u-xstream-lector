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

  @Get('movies/sections')
  moviesSections(@Req() req: any) {
    return this.vod.getMovieRails(req.user.userId);
  }

  @Get('movies/:movieId')
  movieDetailsAlias(@Req() req: any, @Param('movieId') movieId: string) {
    return this.vod.getMovieDetails(req.user.userId, movieId);
  }

  @Get('movies/:movieId/details')
  movieDetails(@Req() req: any, @Param('movieId') movieId: string) {
    return this.vod.getMovieDetails(req.user.userId, movieId);
  }

  @Get('movies/:movieId/url')
  movieUrl(@Req() req: any, @Param('movieId') movieId: string) {
    return this.vod.getMovieStreamUrl(req.user.userId, movieId);
  }

  // ========= SÉRIES =========
  @Get('shows/rails')
  showsRails(@Req() req: any) {
    return this.vod.getShowRails(req.user.userId);
  }

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

  // ========= TV =========
  @Get('live/rails')
  liveRails(@Req() req: any) {
    return this.vod.getLiveRails(req.user.userId);
  }

  @Get('live/sections')
  liveSections(@Req() req: any) {
    return this.vod.getLiveRails(req.user.userId);
  }

  @Get('live/:streamId/url')
  liveUrl(@Req() req: any, @Param('streamId') streamId: string) {
    return this.vod.getLiveStreamUrl(req.user.userId, streamId);
  }

  // ====== TV : Proxy HLS anti-CORS ======
  @Get('live/:streamId/hls.m3u8')
  async liveHlsManifest(@Req() req: any, @Param('streamId') streamId: string, @Res() res: any) {
    const text = await this.vod.getLiveHlsManifest(req.user.userId, streamId);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(text);
  }

  @Get('live/:streamId/hls/seg')
  async liveHlsSegAbs(@Req() req: any, @Param('streamId') streamId: string, @Query('u') u: string, @Res() res: any) {
    await this.vod.pipeLiveAbsoluteSegment(req.user.userId, streamId, u, res);
  }

  // ✅ on forward aussi la query (tokens)
  @Get('live/:streamId/hls/:assetPath(*)')
  async liveHlsSegRelWildcard(
    @Req() req: any,
    @Param('streamId') streamId: string,
    @Param('assetPath') assetPath: string,
    @Query() query: Record<string, any>,
    @Res() res: any,
  ) {
    await this.vod.pipeLiveRelativePath(req.user.userId, streamId, assetPath, query, res);
  }
}
