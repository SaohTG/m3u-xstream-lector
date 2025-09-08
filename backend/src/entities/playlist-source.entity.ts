import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  UpdateDateColumn,
} from 'typeorm';

export type SourceType = 'm3u' | 'xtream';

@Entity('playlist_source')
@Index(['userId', 'type'])
export class PlaylistSource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // plus de ManyToOne(() => User, u => u.sources)
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: SourceType; // 'm3u' | 'xtream'

  @Column({ type: 'text' })
  url!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
