import { Controller, Get } from '@nestjs/common';
import { LiveService } from './live.service';

@Controller('api/live')
export class LiveController {
  constructor(private svc: LiveService) {}

  @Get('channels')
  async channels() {
    return await this.svc.channels();
  }
}
