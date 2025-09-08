import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from '../../entities/favorite.entity';
import { Progress } from '../../entities/progress.entity';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite, Progress])],
  controllers: [LibraryController],
  providers: [LibraryService]
})
export class LibraryModule {}
