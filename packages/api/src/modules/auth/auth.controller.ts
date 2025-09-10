import {
  Controller,
  Post,
  Body,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.auth.login(dto.email, dto.password);

    // cookie httpOnly facultatif (utile si tu veux credentials: 'include')
    res.cookie('token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // passe à true si HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json(result); // { token }
  }
}
