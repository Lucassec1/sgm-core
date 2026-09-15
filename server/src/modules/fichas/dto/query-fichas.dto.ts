import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SituacaoFicha } from '@prisma/client';

// Filtros da Lista de Fichas — ver docs/ux-e-fluxos.md, seção 2 (busca por nome, encontro e status).
export class QueryFichasDto {
  @IsOptional() @IsString() nome?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  numeroEncontro?: number;

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
