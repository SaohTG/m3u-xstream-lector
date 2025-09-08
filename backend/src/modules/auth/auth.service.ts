import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService
  ) {}

  async register(email: string, password: string, displayName?: string) {
    const exists = await this.users.findOne({ where: { email } });
    if (exists) throw new UnauthorizedException('Email already in use');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.users.create({ email, passwordHash, displayName });
    await this.users.save(user);
    const token = await this.sign(user);
    return { access_token: token };
  }

  async login(email: string, password: string) {
    const user = await this.users.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const token = await this.sign(user);
    return { access_token: token };
  }

  async sign(user: User) {
    return this.jwt.signAsync({ sub: user.id, email: user.email });
  }

  async getUserById(id: string) {
    return this.users.findOne({ where: { id } });
  }
}
