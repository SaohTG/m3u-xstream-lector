import { Controller, Get } from '@nestjs/common';
import { TypeOrmHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(private db: TypeOrmHealthIndicator) {}

  @Get()
  check() {
    return { ok: true, timestamp: new Date().toISOString() };
  }

  @Get('/db')
  async checkDb() {
    return this.db.pingCheck('database');
  }
}
