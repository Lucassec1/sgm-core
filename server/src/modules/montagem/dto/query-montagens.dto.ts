import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { StatusMontagem } from '@prisma/client';

// TODO: paroquiaId deve vir do usuário autenticado, não da query — provisório até o módulo Auth existir.
export class QueryMontagensDto {
  @IsUUID()
  paroquiaId!: string;

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
