import { DataSourceOptions } from 'typeorm';
import { User } from './entities/user.entity';
import { PlaylistSource } from './entities/playlist-source.entity';
import { MediaItem } from './entities/media-item.entity';
import { Favorite } from './entities/favorite.entity';
import { Progress } from './entities/progress.entity';

export const getDataSourceOptions = (): DataSourceOptions => {
  const url = process.env.DATABASE_URL || 'postgres://iptv:iptv@localhost:5432/iptvapp';
  return {
    type: 'postgres',
    url,
    entities: [User, PlaylistSource, MediaItem, Favorite, Progress],
    synchronize: true, // For dev only
  };
};
