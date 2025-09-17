import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from './config/config.module';
import { typeOrmModuleAsyncOptions } from './config/typeorm.config';
import { HealthModule } from './modules/health/health.module';
import { PlaylistsModule } from './modules/playlists/playlists.module';
import { LiveModule } from './modules/live/live.module';
import { VodModule } from './modules/vod/vod.module';
import { EpgModule } from './modules/epg/epg.module';
import { CommonModule } from './common/common.module';
import { validate } from './config/env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath:
        process.env.NODE_ENV === 'development'
          ? 'packages/api/.env'
          : '.env',
    }),
    TypeOrmModule.forRootAsync(typeOrmModuleAsyncOptions),
    AppConfigModule,
    CommonModule,
    HealthModule,
    PlaylistsModule,
    LiveModule,
    VodModule,
    EpgModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
