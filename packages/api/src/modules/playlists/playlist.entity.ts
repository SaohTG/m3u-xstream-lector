import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('playlists')
export class Playlist {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() user_id!: string; // demo-user
  @Column({ type: 'varchar' }) type!: 'M3U' | 'XTREAM';

  @Column({ type: 'varchar', nullable: true }) url!: string | null;

  @Column({ type: 'varchar', nullable: true }) base_url!: string | null;
  @Column({ type: 'varchar', nullable: true }) username!: string | null;
  @Column({ type: 'varchar', nullable: true }) password!: string | null;

  @Column({ type: 'varchar', nullable: true }) m3u_url!: string | null;

  @Column({ type: 'varchar', nullable: true }) name!: string | null;
  @Column({ type: 'boolean', default: true }) active!: boolean;

  @CreateDateColumn() created_at!: Date;
  @UpdateDateColumn() updated_at!: Date;
}
