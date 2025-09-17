import { Controller, Get } from '@nestjs/common';
import { LiveService } from './live.service';

@Controller('live')
export class LiveController {
  constructor(private readonly liveService: LiveService) {}

  @Get('channels')
  async getChannels() {
    return this.liveService.getChannels('default_user');
  }
}
