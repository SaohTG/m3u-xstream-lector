import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ProgressEntity } from './progress.entity';
import { ReportProgressDto } from './dto/report-progress.dto';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(ProgressEntity)
    private readonly repo: Repository<ProgressEntity>,
  ) {}

  async report(userId: string, dto: ReportProgressDto) {
    if (!dto.duration || dto.duration < 5) return { ok: true }; // ignore trop court
    const position = Math.max(0, Math.min(dto.position, dto.duration));
    const found = await this.repo.findOne({
      where: { user_id: userId, kind: dto.kind, ref_id: dto.refId },
    });

    if (found) {
      found.position = position;
      found.duration = dto.duration;
      if (dto.seriesId) found.series_id = dto.seriesId;
      await this.repo.save(found);
    } else {
      const created = this.repo.create({
        user_id: userId,
        kind: dto.kind,
        ref_id: dto.refId,
        series_id: dto.seriesId ?? null,
        position,
        duration: dto.duration,
      });
      await this.repo.save(created);
    }
    return { ok: true };
  }

  // retourne les items 5%-95% d’avancement (limite 25)
  async listInProgress(userId: string, kind: 'MOVIE' | 'EPISODE', limit = 25) {
    const rows = await this.repo.find({
      where: [{ user_id: userId, kind, duration: Not(0), position: Not(0) }],
      order: { updated_at: 'DESC' },
      take: limit * 2,
    });
    const filtered = rows.filter(r => {
      if (!r.duration) return false;
      const pct = r.position / r.duration;
      return pct >= 0.05 && pct <= 0.95;
    });
    return filtered.slice(0, limit);
  }
}
