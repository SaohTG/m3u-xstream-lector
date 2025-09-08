import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const h = req.headers['authorization'] as string | undefined;
    if (!h) throw new UnauthorizedException('No token');
    const token = h.replace('Bearer ', '');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change_me') as any;
      req.user = { id: decoded.sub, email: decoded.email };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
