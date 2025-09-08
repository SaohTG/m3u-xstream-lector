// AVANT
// import * as bcrypt from 'bcrypt';

// APRÈS
import * as bcrypt from 'bcryptjs';

import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService) {}

  private sign(userId: string, email: string) {
    return this.jwt.sign({ sub: userId, email });
  }

  async signup(email: string, password: string) {
    const exists = await this.users.findByEmail(email);
    if (exists) throw new BadRequestException('Email déjà utilisé');
    const hash = await bcrypt.hash(password, 10);
    const user = await this.users.create(email, hash);
    return { accessToken: this.sign(user.id, user.email) };
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Identifiants invalides');
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Identifiants invalides');
    return { accessToken: this.sign(user.id, user.email) };
  }
}
