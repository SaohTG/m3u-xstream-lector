import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('favorite')
@Index(['userId', 'mediaId'], { unique: true })
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // plus de relation ManyToOne vers User
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  mediaId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
