import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { StatusConvite, TipoPessoa } from '@prisma/client';
import { EmptyToUndefined } from '../../../common/transformers/empty-to-undefined.transformer';

// Atribuir uma pessoa (Ficha ou FichaCasal) a uma vaga da Montagem. R1–R4 não bloqueiam: viram
// avisos que exigem confirmação consciente (AlocacoesService — decisão de 14/10/2026, ver
// docs/regras-imutaveis.md).
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

  // Confirma consciente os avisos de R1–R4 devolvidos pela Service (409 AVISOS_REGRAS).
  @IsOptional() @IsBoolean() confirmarAvisos?: boolean;
  // Nome antigo (só R2) — aceito pra não quebrar um client ainda não atualizado durante o deploy.
  @IsOptional() @IsBoolean() confirmarRepeticao?: boolean;

  // R9 — quem fez a ação, pro log de atividade (sem Auth real ainda, digitado manualmente).
  @IsOptional() @IsString() usuario?: string;
}
