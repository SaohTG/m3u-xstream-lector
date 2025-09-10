import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { VodController } from './vod.controller';
import { VodService } from './vod.service';
import { PlaylistsModule } from '../playlists/playlists.module';

@Module({
  imports: [
    PlaylistsModule,
    JwtModule.register({ secret: process.env.JWT_SECRET || 'changeme' }),
  ],
  controllers: [VodController],
  providers: [VodService],
  exports: [VodService],
})
export class VodModule {}
