import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { ProgressKind } from '../progress.entity';

export class ReportProgressDto {
  @IsIn(['MOVIE', 'EPISODE'])
  kind!: ProgressKind;

  @IsString()
  refId!: string; // movieId ou episodeId

  @IsOptional()
  @IsString()
  seriesId?: string; // recommandé pour EPISODE

  @IsInt() @Min(0)
  position!: number; // s

  @IsInt() @Min(0)
  duration!: number; // s
}
