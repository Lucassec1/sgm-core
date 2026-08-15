import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { SituacaoFicha } from '@prisma/client';

// Filtros da Lista de Casais — busca por nome (dele ou dela) e status.
// TODO: paroquiaId deve vir do usuário autenticado, não da query — provisório até o módulo Auth existir.
export class QueryFichasCasaisDto {
  @IsUUID()
  paroquiaId!: string;

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
  pageSize?: number;
}
