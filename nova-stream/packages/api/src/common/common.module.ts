import { Module } from '@nestjs/common';
import { HttpService } from './http';

@Module({
  providers: [HttpService],
  exports: [HttpService],
})
export class CommonModule {}
