// packages/api/src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';

function ensureOne<T>(val: T | T[] | null | undefined): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return (val ?? null) as T | null;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async findUserByEmail(normEmail: string): Promise<User | null> {
    // Chemin standard (retourne User | null)
    const u1 = await this.users.findOne({ where: { email: normEmail } as any });
    if (u1) return u1;

    // Fallback si du code/driver renvoie un tableau
    const u2 = await this.users.find({ where: { email: normEmail } as any, take: 1 });
    return ensureOne<User>(u2);
  }

  private async signToken(user: User): Promise<string> {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new InternalServerErrorException('JWT_SECRET non configuré');
    return this.jwt.signAsync({ sub: user.id, email: user.email }, { secret, expiresIn: '7d' });
  }

  async signup(email: string, password: string): Promise<{ token: string }> {
    if (!email || !password) throw new BadRequestException('Email/mot de passe requis');
    const norm = this.normalizeEmail(email);

    const existing = await this.findUserByEmail(norm);
    if (existing) throw new BadRequestException('Email déjà utilisé');

    const password_hash = await bcrypt.hash(password, 10);

    const entity = this.users.create({
      email: norm,
      password_hash,
      created_at: new Date(),
    } as any);

    const saved = await this.users.save(entity);
    const user = ensureOne<User>(saved as any);
    if (!user) throw new InternalServerErrorException('Échec de création utilisateur');

    const token = await this.signToken(user);
    return { token };
  }

  async login(email: string, password: string): Promise<{ token: string }> {
    if (!email || !password) throw new UnauthorizedException('Email ou mot de passe manquant');
    const norm = this.normalizeEmail(email);

    const user = await this.findUserByEmail(norm);
    if (!user || !user.password_hash) throw new UnauthorizedException('Identifiants invalides');

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Identifiants invalides');

    const token = await this.signToken(user);
    return { token };
  }
}
