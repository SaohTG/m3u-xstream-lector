import { Entity, PrimaryGeneratedColumn, ManyToOne, UpdateDateColumn, Column, Index } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Progress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, u => u.progresses, { onDelete: 'CASCADE' })
  user!: User;

  @Index()
  @Column()
  mediaId!: string; // reference to MediaItem.externalId

  @Column({ type: 'int', default: 0 })
  position!: number; // seconds

  @Column({ type: 'int', default: 0 })
  duration!: number; // seconds

  @UpdateDateColumn()
  updatedAt!: Date;
}
