import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { SituacaoFicha } from '@prisma/client';
import { EmptyToUndefined } from '../../../common/transformers/empty-to-undefined.transformer';

// TODO: paroquiaId deve vir do usuário autenticado (guard), não do body —
// provisório até o módulo Auth existir (ver docs/arquitetura.md, seção 1).
export class CreateFichaCasalDto {
  @IsUUID()
  paroquiaId!: string;

  // Identificação
  @IsString()
  @MinLength(3)
  nomeEle!: string;

  @IsString()
  @MinLength(3)
  nomeEla!: string;

  @EmptyToUndefined() @IsOptional() @IsDateString() dataNascimentoEle?: string;
  @EmptyToUndefined() @IsOptional() @IsDateString() dataNascimentoEla?: string;

  @IsString()
  telefoneEle!: string;

  @IsString()
  telefoneEla!: string;

  @EmptyToUndefined() @IsOptional() @IsEmail() emailEle?: string;
  @EmptyToUndefined() @IsOptional() @IsEmail() emailEla?: string;
  @IsOptional() @IsString() fotoUrl?: string;

  // Endereço
  @IsOptional() @IsString() logradouro?: string;
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() complemento?: string;
  @IsOptional() @IsString() bairro?: string;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() cep?: string;

  @IsOptional() @IsBoolean() temFilhosNoSegueMe?: boolean;
  @IsOptional() @IsString() observacoesFilhos?: string;
  @IsOptional() @IsString() observacoes?: string;

  @IsOptional() @IsEnum(SituacaoFicha) situacao?: SituacaoFicha;
  @IsOptional() @IsString() motivoDesativacao?: string;

  // R3, Grupo B (módulo Montagem) — marcado manualmente até o Auth existir de verdade.
  @IsOptional() @IsBoolean() jaFoiEquipeDirigente?: boolean;
}
