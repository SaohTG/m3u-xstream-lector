import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  UpdateDateColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('progress')
@Index(['userId', 'mediaId'], { unique: true })
export class Progress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // plus de ManyToOne(() => User, u => u.progresses)
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  mediaId!: string;

  @Column({ type: 'int', default: 0 })
  position!: number; // secondes

  @Column({ type: 'int', default: 0 })
  duration!: number; // secondes

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
