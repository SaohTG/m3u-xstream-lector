import { DataSourceOptions } from 'typeorm';
import { Media } from './entities/media.entity';
// ... autres entités

export const getDataSourceOptions = (): DataSourceOptions => ({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true, // OK en dev; en prod, utiliser migrations
  entities: [Media /*, ...*/],
});
