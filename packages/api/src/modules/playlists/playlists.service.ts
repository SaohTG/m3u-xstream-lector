import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Playlist } from './playlist.entity';
import { http } from '../../common/http';
import { parseM3U } from '@novastream/shared/dist/m3u-parser.js';
import { discoverBase } from '@novastream/shared/dist/xtream.js';

@Injectable()
export class PlaylistsService {
  private readonly logger = new Logger(PlaylistsService.name);
  private readonly demoUser = 'demo-user';

  constructor(@InjectRepository(Playlist) private repo: Repository<Playlist>) {}

  async active(): Promise<Playlist | null> {
    return await this.repo.findOne({ where: { user_id: this.demoUser, active: true } });
  }

  async unlink(): Promise<{ ok: true }> {
    await this.repo.update({ user_id: this.demoUser, active: true }, { active: false });
    return { ok: true };
  }

  private async validateM3U(url: string) {
    // try https first, then http if needed
    let lastErr: any;
    for (const candidate of [url, url.replace(/^https:\/\//, 'http://')]) {
      try {
        const res = await http.get(candidate, { responseType: 'text' });
        const text = typeof res.data === 'string' ? res.data : res.data?.toString?.() ?? '';
        const entries = parseM3U(text);
        if (entries.length > 0) return true;
      } catch (e) { lastErr = e; }
    }
    this.logger.warn(`M3U validation failed for ${url}: ${lastErr?.message}`);
    return false;
  }

  async linkM3U(url: string, name?: string) {
    const ok = await this.validateM3U(url);
    if (!ok) throw new Error('Invalid or empty M3U');
    await this.repo.update({ user_id: this.demoUser }, { active: false });
    const saved = await this.repo.save({
      user_id: this.demoUser,
      type: 'M3U',
      url,
      m3u_url: url,
      name: name ?? null,
      active: true,
      base_url: null,
      username: null,
      password: null
    });
    return saved;
  }

  async linkXtream(hostOrUrl: string, username: string, password: string, name?: string) {
    const d = await discoverBase(hostOrUrl, username, password, process.env.DEFAULT_USER_AGENT || 'Mozilla/5.0');
    if (!d.ok || !d.endpoint) throw new Error('XTREAM discovery failed');
    this.logger.log(`XTREAM discovery OK via ${d.endpoint}`);
    await this.repo.update({ user_id: this.demoUser }, { active: false });
    const saved = await this.repo.save({
      user_id: this.demoUser,
      type: 'XTREAM',
      url: d.cleanUrl || hostOrUrl,
      base_url: d.endpoint,
      username,
      password,
      name: name ?? null,
      active: true,
      m3u_url: null
    });
    return saved;
  }
}
