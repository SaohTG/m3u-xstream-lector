import { Controller, Get, Query } from '@nestjs/common';
import { EpgService } from './epg.service';

@Controller('epg')
export class EpgController {
  constructor(private readonly epgService: EpgService) {}

  @Get()
  getEpgForChannel(@Query('channelId') channelId: string) {
    return this.epgService.getEpgForChannel(channelId);
  }
}
