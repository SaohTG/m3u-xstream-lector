import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaylistSource } from '../../entities/playlist-source.entity';
import { MediaItem } from '../../entities/media-item.entity';
import { PlaylistsController } from './playlists.controller';
import { PlaylistsService } from './playlists.service';
import { TmdbModule } from '../tmdb/tmdb.module';

@Module({
  imports: [TypeOrmModule.forFeature([PlaylistSource, MediaItem]), TmdbModule],
  controllers: [PlaylistsController],
  providers: [PlaylistsService]
})
export class PlaylistsModule {}
