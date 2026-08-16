import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { StatusConvite, TipoPessoa } from '@prisma/client';
import { EmptyToUndefined } from '../../../common/transformers/empty-to-undefined.transformer';

// Atribuir uma pessoa (Ficha ou FichaCasal) a uma vaga da Montagem. A atribuição em si é
// sempre livre — não há validação de regras R1-R3 nem do bloqueio de convite do R4 nesta
// etapa (ver plano da etapa "Módulo Montagem — Schema + Fundação Backend").
export class CreateAlocacaoDto {
  @IsUUID()
  vagaMontagemId!: string;

  @IsEnum(TipoPessoa)
  tipoPessoa!: TipoPessoa;

  @EmptyToUndefined() @IsOptional() @IsUUID() fichaId?: string;
  @EmptyToUndefined() @IsOptional() @IsUUID() fichaCasalId?: string;

  @IsOptional() @IsEnum(StatusConvite) status?: StatusConvite;
  @IsOptional() @IsDateString() dataConvite?: string;
  @IsOptional() @IsString() motivoRecusa?: string;
}
