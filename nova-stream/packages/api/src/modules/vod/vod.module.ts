import { Module } from '@nestjs/common';
import { VodController } from './vod.controller';
import { VodService } from './vod.service';
import { PlaylistsModule } from '../playlists/playlists.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [PlaylistsModule, CommonModule],
  controllers: [VodController],
  providers: [VodService],
})
export class VodModule {}
