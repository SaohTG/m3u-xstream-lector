// packages/api/src/modules/vod/vod.controller.ts
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

  /** Récupère le JWT depuis Authorization, query ?t=, ou cookies */
  private requireAuth(req: any) {
    const secret = process.env.JWT_SECRET || 'changeme';
    let token = '';

    // 1) Authorization: Bearer ...
    const h = req.headers?.authorization;
    if (h && typeof h === 'string' && /^bearer /i.test(h)) {
      token = h.slice(7);
    }

    // 2) Query ?t=
    if (!token && typeof req.query?.t === 'string') {
      token = req.query.t;
    }

    // 3) Cookies (httpOnly côté API)
    if (!token) {
      const c = req.cookies || {};
      token = c.token || c.access_token || '';
    }

    if (!token) throw new UnauthorizedException('Missing token');

    try {
      return this.jwt.verify(token, { secret });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /** ----------- MOVIES ----------- */
  @Get('movies/rails')
  async movieRails(@Req() req: any) {
    const user = this.requireAuth(req);
    return await this.vod.getMovieRails(user?.sub);
  }

  @Get('movies/:id/details')
  async movieDetails(@Param('id') id: string, @Req() req: any) {
    const user = this.requireAuth(req);
    return await this.vod.getMovieDetails(id, user?.sub);
  }

  @Get('movies/:id/hls')
  async movieHls(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    this.requireAuth(req);
    const text = await this.vod.buildMovieHls(id, req);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-store');
    res.send(text);
  }

  /** ----------- EPISODES ----------- */
  @Get('episodes/:id/hls')
  async episodeHls(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    this.requireAuth(req);
    const text = await this.vod.buildEpisodeHls(id, req);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-store');
    res.send(text);
  }

  /** ----------- PROXY SEGMENTS ----------- */
  @Get('proxy/seg')
  async proxySeg(@Query('u') u: string, @Req() req: any, @Res() res: any) {
    this.requireAuth(req);
    await this.vod.pipeSegment(u, res);
  }
}
