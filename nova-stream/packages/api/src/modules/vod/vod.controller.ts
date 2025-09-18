import { Controller, Get, Param } from '@nestjs/common';
import { VodService } from './vod.service';

@Controller('vod')
export class VodController {
  constructor(private readonly vodService: VodService) {}

  // --- Movies ---
  @Get('movies')
  getMovies() {
    return this.vodService.getAllMovies('default_user');
  }

  @Get('movies/rails')
  getMovieRails() {
    // In a real app, this would have more complex logic
    return this.vodService.getMovieRails('default_user');
  }

  @Get('movies/:id')
  getMovie(@Param('id') id: string) {
    return this.vodService.getMovieDetails('default_user', id);
  }

  @Get('movies/:id/stream')
  getMovieStream(@Param('id') id: string) {
    return this.vodService.getMovieStreamInfo('default_user', id);
  }


  // --- Series ---
  @Get('series')
  getSeries() {
    return this.vodService.getAllSeries('default_user');
  }

  @Get('series/rails')
  getSeriesRails() {
    return this.vodService.getSeriesRails('default_user');
  }

  @Get('series/:id')
  getSeriesDetails(@Param('id') id: string) {
    return this.vodService.getSeriesDetails('default_user', id);
  }

  @Get('series/:id/episodes')
  getSeriesEpisodes(@Param('id') id: string) {
      return this.vodService.getSeriesEpisodes('default_user', id);
  }

  @Get('series/:seriesId/episodes/:episodeId/stream')
  getEpisodeStream(
    @Param('seriesId') seriesId: string,
    @Param('episodeId') episodeId: string,
  ) {
    return this.vodService.getEpisodeStreamInfo('default_user', seriesId, episodeId);
  }
}
