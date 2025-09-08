import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string; // généré par l'ORM

  @Column({ unique: true })
  email!: string; // requis

  @Column()
  password_hash!: string; // requis

  @Column({ type: 'timestamptz', nullable: true })
  email_verified_at?: Date | null; // nullable

  @CreateDateColumn()
  created_at!: Date; // rempli par l'ORM
}
