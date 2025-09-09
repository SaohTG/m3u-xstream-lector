import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('content')
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private svc: ContentService) {}

  @Get('summary')
  summary(@Req() req: any) {
    return this.svc.summary(req.user.userId);
  }
}
