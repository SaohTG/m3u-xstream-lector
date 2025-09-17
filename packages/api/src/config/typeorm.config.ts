import { DataSourceOptions } from 'typeorm';
import { Playlist } from '../modules/playlists/playlist.entity';

export const typeOrmConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true, // for demo
  logging: false,
  entities: [Playlist]
};
