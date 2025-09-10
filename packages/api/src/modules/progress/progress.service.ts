import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Not, Repository } from 'typeorm';
import { ProgressEntity } from './progress.entity';
import { ReportProgressDto } from './dto/report-progress.dto';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(ProgressEntity)
    private readonly repo: Repository<ProgressEntity>,
  ) {}

  async report(userId: string, dto: ReportProgressDto) {
    if (!dto.duration || dto.duration < 5) return { ok: true }; // ignore vidéos trop courtes
    const position = Math.max(0, Math.min(dto.position, dto.duration));
    const data = await this.repo.findOne({
      where: { user_id: userId, kind: dto.kind, ref_id: dto.refId },
    });

    if (data) {
      data.position = position;
      data.duration = dto.duration;
      if (dto.seriesId) data.series_id = dto.seriesId;
      await this.repo.save(data);
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

  // Renvoie derniers items entre 5% et 95% d’avancement
  async listInProgress(userId: string, kind: 'MOVIE' | 'EPISODE', limit = 25) {
    // filtre: duration>0 et 5% < pos/dur < 95%
    // pour éviter la division côté SQL, on filtre grossièrement en duration>=20s, position>=2s
    const rows = await this.repo.find({
      where: [
        { user_id: userId, kind, duration: Not(0), position: Not(0) },
      ],
      order: { updated_at: 'DESC' },
      take: limit * 2, // on sur-prélève puis on filtrera précisément
    });

    const filtered = rows.filter(r => {
      if (!r.duration) return false;
      const pct = r.position / r.duration;
      return pct >= 0.05 && pct <= 0.95;
    });

    return filtered.slice(0, limit);
  }
}
