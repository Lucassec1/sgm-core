import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { StatusMontagem } from '@prisma/client';

// paroquiaId vem do usuário autenticado (@ParoquiaAtual()), não da query — R7.
export class QueryMontagensDto {
  @IsOptional() @IsEnum(StatusMontagem) status?: StatusMontagem;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
