import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { VodService } from './vod.service';

@Controller('vod')
export class VodController {
  constructor(
    private readonly vod: VodService,
    private readonly jwt: JwtService,
  ) {}

  /** Vérifie JWT via header ou query ?t= */
  private requireAuth(req: any) {
    let token = '';
    const h = req.headers?.authorization;
    if (h && typeof h === 'string' && h.toLowerCase().startsWith('bearer ')) token = h.slice(7);
    if (!token && typeof req.query?.t === 'string') token = req.query.t;
    if (!token) throw new UnauthorizedException('Missing token');
    try {
      return this.jwt.verify(token, { secret: process.env.JWT_SECRET || 'changeme' });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Get('movies/:id/hls')
  async movieHls(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    this.requireAuth(req);
    const text = await this.vod.buildMovieHls(id, req);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-store');
    res.send(text);
  }

  @Get('episodes/:id/hls')
  async episodeHls(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    this.requireAuth(req);
    const text = await this.vod.buildEpisodeHls(id, req);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-store');
    res.send(text);
  }

  @Get('proxy/seg')
  async proxySeg(@Query('u') u: string, @Req() req: any, @Res() res: any) {
    this.requireAuth(req);
    await this.vod.pipeSegment(u, res);
  }
}
