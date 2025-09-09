import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type PlaylistType = 'M3U' | 'XTREAM';

@Entity('playlists')
export class Playlist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: PlaylistType;

  // M3U
  @Column({ type: 'text', nullable: true })
  url!: string | null;

  // Xtream
  @Column({ type: 'text', nullable: true })
  base_url!: string | null;

  @Column({ type: 'text', nullable: true })
  username!: string | null;

  @Column({ type: 'text', nullable: true })
  password!: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
