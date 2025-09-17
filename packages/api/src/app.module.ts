import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeorm.config';
import { HealthController } from './modules/health/health.controller';
import { Playlist } from './modules/playlists/playlist.entity';
import { PlaylistsController } from './modules/playlists/playlists.controller';
import { PlaylistsService } from './modules/playlists/playlists.service';
import { LiveController } from './modules/live/live.controller';
import { LiveService } from './modules/live/live.service';
import { VodController } from './modules/vod/vod.controller';
import { VodService } from './modules/vod/vod.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: () => typeOrmConfig }),
    TypeOrmModule.forFeature([Playlist])
  ],
  controllers: [HealthController, PlaylistsController, LiveController, VodController],
  providers: [PlaylistsService, LiveService, VodService]
})
export class AppModule {}
