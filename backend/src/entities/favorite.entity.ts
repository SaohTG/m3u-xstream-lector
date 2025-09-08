import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Column, Index } from 'typeorm';
import { User } from './user.entity';
import { MediaItem } from './media-item.entity';

@Entity()
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, u => u.favorites, { onDelete: 'CASCADE' })
  user!: User;

  @Index()
  @Column()
  mediaId!: string; // reference to MediaItem.externalId

  @CreateDateColumn()
  createdAt!: Date;
}
