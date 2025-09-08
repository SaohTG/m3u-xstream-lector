import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export type SourceType = 'm3u' | 'xtream';

@Entity('source')
@Index(['user', 'type'])
export class Source {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (u) => u.sources, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'varchar', length: 16 })
  type!: SourceType;           // 'm3u' | 'xtream'

  @Column({ type: 'text' })
  url!: string;                // URL M3U ou base URL Xtream

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
