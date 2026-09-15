import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SituacaoFicha } from '@prisma/client';

// Filtros da Lista de Casais — busca por nome (dele ou dela) e status.
export class QueryFichasCasaisDto {
  @IsOptional() @IsString() nome?: string;

  @IsOptional() @IsEnum(SituacaoFicha) situacao?: SituacaoFicha;

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
