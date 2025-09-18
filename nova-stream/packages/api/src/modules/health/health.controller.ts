import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  constructor() {}

  @Get()
  check() {
    return { ok: true, timestamp: new Date().toISOString() };
  }
}
