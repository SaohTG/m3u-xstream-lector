import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
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

  async login(email: string, password: string): Promise<{ token: string }> {
    if (!email || !password) {
      throw new UnauthorizedException('Email ou mot de passe manquant');
    }

    const user = await this.users.findOne({
      where: { email: email.toLowerCase() as any },
    });

    if (!user || !user.password_hash) {
      // pas d’info sensible
      throw new UnauthorizedException('Identifiants invalides');
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // on remonte un 500 clair si la conf est incomplète
      throw new InternalServerErrorException('JWT_SECRET non configuré');
    }

    const token = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { secret, expiresIn: '7d' },
    );

    return { token };
  }
}
