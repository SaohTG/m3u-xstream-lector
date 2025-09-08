import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaylistsController } from './playlists.controller';
import { PlaylistsService } from './playlists.service';
import { Media } from '../entities/media.entity';
import { Source } from '../entities/source.entity';  // <— ce chemin est CORRECT

@Module({
  imports: [TypeOrmModule.forFeature([Media, Source])],
  controllers: [PlaylistsController],
  providers: [PlaylistsService],
  exports: [PlaylistsService],
})
export class PlaylistsModule {}
