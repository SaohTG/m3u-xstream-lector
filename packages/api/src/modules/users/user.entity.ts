import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) email: string;
  @Column() password_hash: string;
  @Column({ type: 'timestamptz', nullable: true }) email_verified_at: Date | null;
  @CreateDateColumn() created_at: Date;
}
