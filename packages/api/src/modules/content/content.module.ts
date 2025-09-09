import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { VodModule } from '../vod/vod.module';
import { LiveModule } from '../live/live.module';
import { PlaylistsModule } from '../playlists/playlists.module';

@Module({
  imports: [VodModule, LiveModule, PlaylistsModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
