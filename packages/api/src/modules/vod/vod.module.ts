import { Module } from '@nestjs/common';
import { VodController } from './vod.controller';
import { VodService } from './vod.service';
import { PlaylistsModule } from '../playlists/playlists.module';

@Module({
  imports: [PlaylistsModule],
  controllers: [VodController],
  providers: [VodService],
  exports: [VodService],
})
export class VodModule {}
