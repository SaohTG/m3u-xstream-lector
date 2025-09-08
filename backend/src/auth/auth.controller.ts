import { Controller, Post, Body } from '@nestjs/common';
import { Public } from '../../common/public.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: { email: string; password: string; displayName?: string }) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: { email: string; password: string }) {
    return this.auth.login(dto);
  }
}
