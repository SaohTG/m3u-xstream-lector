import { Controller, Get, Param } from '@nestjs/common';
import { VodService } from './vod.service';

@Controller('api/vod')
export class VodController {
  constructor(private svc: VodService) {}

  // Movies
  @Get('movies/rails')
  async moviesRails() { return await this.svc.moviesRails(); }

  @Get('movies')
  async movies() { return await this.svc.moviesList(); }

  @Get('movies/:id')
  async movie(@Param('id') id: string) { return await this.svc.movieInfo(id); }

  @Get('movies/:id/stream')
  async movieStream(@Param('id') id: string) { return { url: await this.svc.movieStreamUrl(id) }; }

  // Series
  @Get('series/rails')
  async seriesRails() { return await this.svc.seriesRails(); }

  @Get('series')
  async series() { return await this.svc.seriesList(); }

  @Get('series/:id')
  async seriesInfo(@Param('id') id: string) { return await this.svc.seriesInfo(id); }

  @Get('series/:id/episodes/:episodeId/stream')
  async epStream(@Param('episodeId') episodeId: string) { return { url: await this.svc.episodeStreamUrl('', episodeId) }; }
}
