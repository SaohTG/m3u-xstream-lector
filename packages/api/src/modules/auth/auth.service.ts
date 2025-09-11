import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs'; // pur JS, évite les soucis de build
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';

function ensureUser(u: User | User[] | null | undefined): User {
  if (!u) throw new UnauthorizedException('User not found');
  return Array.isArray(u) ? u[0] : u;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  /** Inscription par email + mot de passe. Retourne un token JWT. */
  async signup(email: string, password: string) {
    // IMPORTANT: findOne, pas find
    const exists = await this.users.findOne({ where: { email } as any });
    if (exists) throw new ConflictException('Email already registered');

    const password_hash = await bcrypt.hash(password, 10);
    const entity = this.users.create({ email, password_hash } as any);

    // Ne pas faire save([entity]) !
    const savedRaw = await this.users.save(entity as any);
    const saved = ensureUser(savedRaw);

    const token = await this.signToken(saved);
    return { token };
  }

  /** Valide les identifiants, renvoie l’entité User ou lève 401. */
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.users.findOne({ where: { email } as any });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  /** Connexion en une étape (email+password). */
  async loginWithCredentials(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const token = await this.signToken(user);
    return { token };
  }

  /** Connexion quand on a déjà le User (ex: guard local). */
  async login(user: User | User[]) {
    const u = ensureUser(user);
    const token = await this.signToken(u);
    return { token };
  }

  /** Signe un JWT compatible avec JwtStrategy (payload: { sub, email }). */
  private async signToken(user: User): Promise<string> {
    const payload = { sub: user.id, email: user.email };
    return this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET!,
      expiresIn: '7d',
    });
  }

  /** Utilitaire : retrouve un utilisateur par email. */
  async findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email } as any });
  }
}
