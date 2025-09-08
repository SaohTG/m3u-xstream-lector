import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from '../entities/media.entity';

@Controller('library')
export class LibraryController {
  constructor(@InjectRepository(Media) private readonly mediaRepo: Repository<Media>) {}

  @Get('movies')
  async movies(@Query('q') q?: string, @Query('page') page = 1, @Query('pageSize') pageSize = 48) {
    const take = Math.min(200, Math.max(1, Number(pageSize)));
    const skip = (Math.max(1, Number(page)) - 1) * take;
    const qb = this.mediaRepo.createQueryBuilder('m').where('m.type = :t', { t: 'movie' });
    if (q) qb.andWhere('m.title ILIKE :q', { q: `%${q}%` });
    const [items, total] = await qb.orderBy('m.updatedAt', 'DESC').skip(skip).take(take).getManyAndCount();
    return { total, page, pageSize: take, items };
  }

  @Get('series')
  async series(@Query('q') q?: string, @Query('page') page = 1, @Query('pageSize') pageSize = 48) {
    const take = Math.min(200, Math.max(1, Number(pageSize)));
    const skip = (Math.max(1, Number(page)) - 1) * take;
    const qb = this.mediaRepo.createQueryBuilder('m').where('m.type = :t', { t: 'series' });
    if (q) qb.andWhere('m.title ILIKE :q', { q: `%${q}%` });
    const [items, total] = await qb.orderBy('m.updatedAt', 'DESC').skip(skip).take(take).getManyAndCount();
    return { total, page, pageSize: take, items };
  }

  @Get('live')
  async live(@Query('q') q?: string, @Query('page') page = 1, @Query('pageSize') pageSize = 60) {
    const take = Math.min(200, Math.max(1, Number(pageSize)));
    const skip = (Math.max(1, Number(page)) - 1) * take;
    const qb = this.mediaRepo.createQueryBuilder('m').where('m.type = :t', { t: 'live' });
    if (q) qb.andWhere('m.title ILIKE :q', { q: `%${q}%` });
    const [items, total] = await qb.orderBy('m.updatedAt', 'DESC').skip(skip).take(take).getManyAndCount();
    return { total, page, pageSize: take, items };
  }
}
