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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async signup(email: string, password: string): Promise<{ token: string }> {
    if (!email || !password) throw new BadRequestException('Email/mot de passe requis');

    const norm = this.normalizeEmail(email);

    // ✅ Un seul utilisateur
    const existing = await this.users.findOne({ where: { email: norm } });
    if (existing) throw new BadRequestException('Email déjà utilisé');

    const password_hash = await bcrypt.hash(password, 10);
    const user = this.users.create({
      email: norm,
      password_hash,
      created_at: new Date(),
    } as any);
    await this.users.save(user);

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new InternalServerErrorException('JWT_SECRET non configuré');

    const token = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { secret, expiresIn: '7d' },
    );

    return { token };
  }

  async login(email: string, password: string): Promise<{ token: string }> {
    if (!email || !password) throw new UnauthorizedException('Email ou mot de passe manquant');

    const norm = this.normalizeEmail(email);

    // ✅ Un seul utilisateur (PAS find())
    // Tu peux aussi utiliser: await this.users.findOneBy({ email: norm })
    const user = await this.users.findOne({ where: { email: norm } });
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Identifiants invalides');

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new InternalServerErrorException('JWT_SECRET non configuré');

    const token = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { secret, expiresIn: '7d' },
    );

    return { token };
  }
}
