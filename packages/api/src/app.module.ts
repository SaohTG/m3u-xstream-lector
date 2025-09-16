// packages/api/src/app.module.ts
import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PlaylistsModule } from './modules/playlists/playlists.module';
import { VodModule } from './modules/vod/vod.module';
import { ProgressModule } from './modules/progress/progress.module';

const log = new Logger('AppModule');

const DB_HOST = process.env.DB_HOST || 'db';          // << par défaut 'db' (service docker)
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USER = process.env.DB_USER || 'novastream';
const DB_PASS = process.env.DB_PASS || 'c6?NJ*Y3oqd!LUU.!3ct';
const DB_NAME = process.env.DB_NAME || 'novastream';
const SYNC = (process.env.TYPEORM_SYNC || 'true') === 'true';

log.log(`TypeORM -> host=${DB_HOST} port=${DB_PORT} db=${DB_NAME}`);

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: DB_HOST,
      port: DB_PORT,
      username: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      autoLoadEntities: true,
      synchronize: SYNC,
      // Augmente un peu la tolérance lors du démarrage
      retryAttempts: 10,
      retryDelay: 2000,
      // logging: ['error'],
    }),
    AuthModule,
    UsersModule,
    PlaylistsModule,
    VodModule,
    ProgressModule,
  ],
})
export class AppModule {}
