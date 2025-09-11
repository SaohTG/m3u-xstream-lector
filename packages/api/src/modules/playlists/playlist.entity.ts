import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PlaylistType = 'M3U' | 'XTREAM';

@Entity('playlists')
@Index(['user_id', 'active'])
export class Playlist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  user_id!: string;

  // on stocke le type d’origine (XTREAM ou M3U)
  @Column({ type: 'varchar', length: 20, default: 'M3U' })
  type!: PlaylistType;

  // pour XTREAM, on convertit en URL M3U compatible import
  @Column({ type: 'text' })
  url!: string;

  // optionnel : nom affichable
  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
