import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { StatusMontagem } from '@prisma/client';

// Leitura cross-paróquia do Conselho (R8) — paroquiaId é opcional aqui (diferente da versão
// de paróquia): sem ele, lista montagens de TODAS as paróquias.
export class QueryConselhoMontagensDto {
  @IsOptional() @IsUUID() paroquiaId?: string;
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
