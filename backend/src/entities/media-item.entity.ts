import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

export type MediaType = 'movie'|'series'|'channel';

@Entity()
export class MediaItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  externalId!: string; // derived from M3U/Xtream ids

  @Column()
  type!: MediaType;

  @Column()
  title!: string;

  @Column({ nullable: true })
  group?: string;

  @Column({ nullable: true })
  posterUrl?: string;

  @Column({ nullable: true })
  streamUrl?: string;
}
