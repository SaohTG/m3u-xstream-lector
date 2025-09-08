import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaylistsController } from './playlists.controller';
import { PlaylistsService } from './playlists.service';
import { Media } from '../entities/media.entity';

@Module({
  imports: [
    // ➜ rend Repository<Media> injectable dans ce module
    TypeOrmModule.forFeature([Media]),
  ],
  controllers: [PlaylistsController],
  providers: [PlaylistsService],
  exports: [PlaylistsService],
})
export class PlaylistsModule {}
