import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TipoPessoa } from '@prisma/client';
import { EmptyToUndefined } from '../../../common/transformers/empty-to-undefined.transformer';

// Adiciona uma pessoa (Ficha ou FichaCasal) à lista geral de substituição da Montagem —
// ver docs/ux-e-fluxos.md, seção 3 ("Lista de substituição, geral, não por vaga").
export class CreateItemListaSubstituicaoDto {
  @IsEnum(TipoPessoa)
  tipoPessoa!: TipoPessoa;

  @EmptyToUndefined() @IsOptional() @IsUUID() fichaId?: string;
  @EmptyToUndefined() @IsOptional() @IsUUID() fichaCasalId?: string;

  @IsOptional() @IsString() nota?: string;

  // R9 — quem fez a ação, pro log de atividade (sem Auth real ainda, digitado manualmente).
  @IsOptional() @IsString() usuario?: string;
}
