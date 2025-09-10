import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, Unique } from 'typeorm';

export type ProgressKind = 'MOVIE' | 'EPISODE';

@Entity('progress')
@Unique('uq_progress_user_kind_ref', ['user_id', 'kind', 'ref_id'])
export class ProgressEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  user_id!: string;

  @Column({ type: 'varchar', length: 10 })
  kind!: ProgressKind; // MOVIE | EPISODE

  // movieId (pour MOVIE) ou episodeId (pour EPISODE)
  @Column({ type: 'varchar', length: 64 })
  ref_id!: string;

  // pour EPISODE uniquement (facilite la résolution des métadonnées)
  @Column({ type: 'varchar', length: 64, nullable: true })
  series_id!: string | null;

  @Column({ type: 'int', default: 0 })
  position!: number; // secondes

  @Column({ type: 'int', default: 0 })
  duration!: number; // secondes

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
