import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { LibraryModule } from './library/library.module';
import { TmdbModule } from './tmdb/tmdb.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      // ✅ charge automatiquement les entités des modules forFeature()
      autoLoadEntities: true,
      // OK en dev (recréation/ajustement du schéma)
      synchronize: true,
    }),
    AuthModule,
    PlaylistsModule,
    LibraryModule,
    TmdbModule,
  ],
})
export class AppModule {}
