import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

import { JwtAuthGuard } from '../common/jwt-auth.guard'; // guard global (+ @Public() sur /auth)

import { AuthModule } from './auth/auth.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { LibraryModule } from './library/library.module';
import { TmdbModule } from './tmdb/tmdb.module';

@Module({
  imports: [
    // Variables d'env disponibles partout
    ConfigModule.forRoot({ isGlobal: true }),

    // TypeORM – charge automatiquement toutes les entités déclarées via forFeature()
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL, // ex: postgres://iptv:iptv@db:5432/iptvapp
      autoLoadEntities: true,
      synchronize: true, // ✅ OK en dev. Désactive en prod et utilise des migrations.
      // logging: ['error'], // décommente si besoin
    }),

    // Modules applicatifs
    AuthModule,
    PlaylistsModule,
    LibraryModule,
    TmdbModule,
  ],
  providers: [
    // Protège TOUTE l’API par défaut (sauf routes décorées @Public())
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
