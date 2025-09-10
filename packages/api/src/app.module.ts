import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PlaylistsModule } from './modules/playlists/playlists.module';
import { VodModule } from './modules/vod/vod.module';
import { LiveModule } from './modules/live/live.module';
import { ContentModule } from './modules/content/content.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
      logging: ['error"],
    }),
    AuthModule,
    UsersModule,
    PlaylistsModule,
    VodModule,
    LiveModule,
    ContentModule, // <= NEW
  ],
})
export class AppModule {}
