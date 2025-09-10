import { Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { VodService } from './vod.service';

@Controller('vod')
@UseGuards(JwtAuthGuard)
export class VodController {
  constructor(private readonly vod: VodService) {}

  // --- (tes routes films / séries / live rails & url habituelles restent ici) ---

  // ================== TV (Live) : Proxy HLS pour éviter CORS ==================
  // Manifeste HLS proxifié et réécrit
  @Get('live/:streamId/hls.m3u8')
  async liveHlsManifest(@Req() req: any, @Param('streamId') streamId: string, @Res() res: Response) {
    const text = await this.vod.getLiveHlsManifest(req.user.userId, streamId);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(text);
  }

  // Segment absolu (si le manifeste contenait des URLs absolues)
  @Get('live/:streamId/hls/seg')
  async liveHlsSegAbs(
    @Req() req: any,
    @Param('streamId') streamId: string,
    @Query('u') u: string,
    @Res() res: Response,
  ) {
    await this.vod.pipeLiveAbsoluteSegment(req.user.userId, streamId, u, res);
  }

  // Segment / sous-manifeste relatif, p.ex. 599260.ts ou 720p.m3u8
  @Get('live/:streamId/hls/:filename')
  async liveHlsSegRel(
    @Req() req: any,
    @Param('streamId') streamId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    await this.vod.pipeLiveRelative(req.user.userId, streamId, filename, res);
  }
}
