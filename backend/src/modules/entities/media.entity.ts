import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type MediaType = 'movie' | 'series' | 'live';

@Entity('media')
@Index(['type', 'title'])
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text' })
  url!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: MediaType;

  @Column({ type: 'text', nullable: true })
  groupTitle?: string;

  @Column({ type: 'text', nullable: true })
  posterUrl?: string;

  @Column({ type: 'int', nullable: true })
  tmdbId?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
