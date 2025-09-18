import { Module } from '@nestjs/common';
import { LiveController } from './live.controller';
import { LiveService } from './live.service';
import { PlaylistsModule } from '../playlists/playlists.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [PlaylistsModule, CommonModule],
  controllers: [LiveController],
  providers: [LiveService],
})
export class LiveModule {}
