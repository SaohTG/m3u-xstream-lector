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

  @Column({ default: 'default_user' }) // In a real app, this would be a relation to a User entity
  @Index()
  user_id: string;

  @Column({
    type: 'enum',
    enum: ['M3U', 'XTREAM'],
  })
  type: PlaylistType;

  @Column({ nullable: true })
  name?: string;

  @Column({ default: false })
  @Index()
  active: boolean;

  // M3U specific fields
  @Column({ name: 'm3u_url', nullable: true })
  m3uUrl?: string;

  // Xtream specific fields
  @Column({ nullable: true })
  url?: string; // clean url, e.g. http://host.com

  @Column({ name: 'base_url', nullable: true })
  baseUrl?: string; // discovered url, e.g. http://host.com:8080

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true, select: false }) // Never return password by default
  password?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
