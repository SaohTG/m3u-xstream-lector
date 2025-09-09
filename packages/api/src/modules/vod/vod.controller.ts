import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { VodService } from './vod.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('vod')
@UseGuards(JwtAuthGuard)
export class VodController {
  constructor(private svc: VodService) {}

  @Get('movies')
  movies(@Req() req: any) {
    return this.svc.movies(req.user.userId);
  }

  @Get('shows')
  shows(@Req() req: any) {
    return this.svc.shows(req.user.userId);
  }
}
