import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PlaylistType } from '@novastream/shared';

@Entity('playlists')
export class Playlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', default: 'default_user' })
  @Index()
  user_id: string;

  @Column({
    type: 'enum',
    enum: ['M3U', 'XTREAM'],
  })
  type: PlaylistType;

  @Column({ type: 'varchar', nullable: true })
  name?: string;

  @Column({ type: 'boolean', default: false })
  @Index()
  active: boolean;

  // M3U specific fields
  @Column({ type: 'varchar', name: 'm3u_url', nullable: true })
  m3uUrl?: string;

  // Xtream specific fields
  @Column({ type: 'varchar', nullable: true })
  url?: string; // clean url, e.g. http://host.com

  @Column({ type: 'varchar', name: 'base_url', nullable: true })
  baseUrl?: string; // discovered url, e.g. http://host.com:8080

  @Column({ type: 'varchar', nullable: true })
  username?: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  password?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
