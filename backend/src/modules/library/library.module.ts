import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryController } from './library.controller';
import { Media } from '../entities/media.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Media])],
  controllers: [LibraryController],
})
export class LibraryModule {}
