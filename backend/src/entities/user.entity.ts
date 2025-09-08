import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { PlaylistSource } from './playlist-source.entity';
import { Favorite } from './favorite.entity';
import { Progress } from './progress.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({ nullable: true })
  displayName?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => PlaylistSource, p => p.user)
  sources!: PlaylistSource[];

  @OneToMany(() => Favorite, f => f.user)
  favorites!: Favorite[];

  @OneToMany(() => Progress, p => p.user)
  progresses!: Progress[];
}
