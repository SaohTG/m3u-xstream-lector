import { Controller, Post, Body, Res, Get, UseGuards, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';

class LoginDto {
  email!: string;
  password!: string;
}

class SignupDto {
  email!: string;
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const { token } = await this.auth.signup(dto.email, dto.password);
    setAuthCookie(res, token);
    return { ok: true };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    // ✅ Appel correct : 2 arguments vers loginWithCredentials
    const { token } = await this.auth.loginWithCredentials(dto.email, dto.password);
    setAuthCookie(res, token);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    // JwtStrategy doit mettre { id, email } dans req.user
    return req.user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.cookie('token', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: (process.env.COOKIE_SECURE ?? 'false') === 'true',
      path: '/',
      maxAge: 0,
    });
    return { ok: true };
  }
}

/** Pose le cookie JWT */
function setAuthCookie(res: Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: (process.env.COOKIE_SECURE ?? 'false') === 'true',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
  });
}
