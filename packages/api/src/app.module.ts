import { Module, LogLevel } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PlaylistsModule } from './modules/playlists/playlists.module';
import { VodModule } from './modules/vod/vod.module';
import { ProgressModule } from './modules/progress/progress.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    }),
    AuthModule,
    UsersModule,
    PlaylistsModule,
    ProgressModule,
    VodModule,
  ],
})
export class AppModule {}
