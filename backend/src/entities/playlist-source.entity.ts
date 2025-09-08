import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

export type SourceType = 'M3U' | 'XTREAM';

@Entity()
export class PlaylistSource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, u => u.sources, { onDelete: 'CASCADE' })
  user!: User;

  @Column()
  type!: SourceType;

  @Column({ nullable: true })
  url?: string; // M3U URL

  @Column({ nullable: true })
  baseUrl?: string; // Xtream base URL

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  password?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
