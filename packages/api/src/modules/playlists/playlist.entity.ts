// packages/api/src/modules/playlists/playlist.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type PlaylistType = 'M3U' | 'XTREAM';

@Entity({ name: 'playlists' })
export class Playlist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  user_id!: string;

  @Column({ type: 'varchar', length: 10 })
  type!: PlaylistType; // 'M3U' | 'XTREAM'

  // Pour M3U
  @Column({ type: 'text', nullable: true })
  url?: string | null;

  // Pour Xtream
  @Column({ type: 'text', nullable: true })
  base_url?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  username?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  password?: string | null;

  // Nouveau: nom affiché dans l’UI (facultatif)
  @Column({ type: 'varchar', length: 120, nullable: true })
  name?: string | null;

  @Column({ type: 'boolean', default: false })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
