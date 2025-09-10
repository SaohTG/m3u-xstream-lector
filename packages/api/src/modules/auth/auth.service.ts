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

  /** Toujours renvoyer UN user (ou null), jamais un tableau */
  private async findUserByEmail(normEmail: string): Promise<User | null> {
    // voie standard (TypeORM v0.3+)
    const u = await this.users.findOne({ where: { email: normEmail } as any });
    if (u) return u;

    // ce fallback couvre le cas où du code legacy retournerait un tableau
    const arr = await this.users.find({ where: { email: normEmail } as any, take: 1 });
    return arr[0] ?? null;
  }

  private async signToken(user: User): Promise<string> {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new InternalServerErrorException('JWT_SECRET non configuré');
    return this.jwt.signAsync({ sub: user.id, email: user.email }, { secret, expiresIn: '7d' });
  }

  async signup(email: string, password: string): Promise<{ token: string }> {
    if (!email || !password) {
      throw new BadRequestException('Email/mot de passe requis');
    }
    const norm = this.normalizeEmail(email);

    const existing = await this.findUserByEmail(norm);
    if (existing) throw new BadRequestException('Email déjà utilisé');

    const password_hash = await bcrypt.hash(password, 10);
    const user = this.users.create({
      email: norm,
      password_hash,
      created_at: new Date(),
    } as any);
    await this.users.save(user);

    const token = await this.signToken(user);
    return { token };
  }

  async login(email: string, password: string): Promise<{ token: string }> {
    if (!email || !password) {
      throw new UnauthorizedException('Email ou mot de passe manquant');
    }
    const norm = this.normalizeEmail(email);

    const user = await this.findUserByEmail(norm);
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Identifiants invalides');

    const token = await this.signToken(user);
    return { token };
  }
}
