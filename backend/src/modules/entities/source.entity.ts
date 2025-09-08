import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from './user.entity'; // ou supprime cette ligne si tu n'as pas user.entity.ts

export type SourceType = 'm3u' | 'xtream';

@Entity('source')
@Index(['type'])
export class Source {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Si tu n'as pas user.entity.ts, supprime le ManyToOne ci-dessous
  // @ManyToOne(() => User, (u) => u.sources, { onDelete: 'CASCADE' })
  // user!: User;

  @Column({ type: 'varchar', length: 16 })
  type!: SourceType;

  @Column({ type: 'text' })
  url!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
