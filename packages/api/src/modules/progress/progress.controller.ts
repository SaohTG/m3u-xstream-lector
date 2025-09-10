import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ProgressService } from './progress.service';
import { ReportProgressDto } from './dto/report-progress.dto';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly svc: ProgressService) {}

  @Post('report')
  async report(@Req() req: any, @Body() dto: ReportProgressDto) {
    return this.svc.report(req.user.userId, dto);
  }
}
