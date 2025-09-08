import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsString, Min, IsOptional } from 'class-validator';
import { JwtGuard } from '../auth/jwt.guard';
import { LibraryService } from './library.service';

class ToggleFavoriteDto {
  @IsString() mediaId!: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() posterUrl?: string;
}
class ProgressDto {
  @IsString() mediaId!: string;
  @IsInt() @Min(0) position!: number;
  @IsInt() @Min(0) duration!: number;
}

@Controller('library')
@UseGuards(JwtGuard)
export class LibraryController {
  constructor(private svc: LibraryService) {}

  @Post('favorites/toggle')
  toggle(@Body() dto: ToggleFavoriteDto, @Req() req: any) {
    return this.svc.toggleFavorite(req.user.id, dto.mediaId);
  }

  @Post('progress')
  progress(@Body() dto: ProgressDto, @Req() req: any) {
    return this.svc.setProgress(req.user.id, dto.mediaId, dto.position, dto.duration);
  }
}
