import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../../entities/favorite.entity';
import { Progress } from '../../entities/progress.entity';

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(Favorite) private favorites: Repository<Favorite>,
    @InjectRepository(Progress) private progresses: Repository<Progress>
  ) {}

  async toggleFavorite(userId: string, mediaId: string) {
    const existing = await this.favorites.findOne({ where: { user: { id: userId }, mediaId }, relations: ['user'] });
    if (existing) {
      await this.favorites.remove(existing);
      return { favored: false };
    } else {
      const fav = this.favorites.create({ user: { id: userId } as any, mediaId });
      await this.favorites.save(fav);
      return { favored: true };
    }
  }

  async setProgress(userId: string, mediaId: string, position: number, duration: number) {
    let p = await this.progresses.findOne({ where: { user: { id: userId }, mediaId }, relations: ['user'] });
    if (!p) {
      p = this.progresses.create({ user: { id: userId } as any, mediaId, position, duration });
    } else {
      p.position = position;
      p.duration = duration;
    }
    await this.progresses.save(p);
    return { ok: true };
  }
}
