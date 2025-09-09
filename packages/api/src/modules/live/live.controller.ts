import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { LiveService } from './live.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('live')
@UseGuards(JwtAuthGuard)
export class LiveController {
  constructor(private svc: LiveService) {}

  @Get('channels')
  channels(@Req() req: any) {
    return this.svc.channels(req.user.userId);
  }

  @Get('channels/sections')
  channelSections(@Req() req: any) {
    return this.svc.channelSections(req.user.userId);
  }
}
