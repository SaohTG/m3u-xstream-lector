import { Module } from '@nestjs/common';
import { VodService } from './vod.service';
import { VodController } from './vod.controller';
import { PlaylistsModule } from '../playlists/playlists.module';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [PlaylistsModule, ProgressModule],
  providers: [VodService],
  controllers: [VodController],
  exports: [VodService],
})
export class VodModule {}
