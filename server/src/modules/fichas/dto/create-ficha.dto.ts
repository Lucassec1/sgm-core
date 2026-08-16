import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { CorCirculo, SituacaoFicha } from '@prisma/client';
import { EmptyToUndefined } from '../../../common/transformers/empty-to-undefined.transformer';

// TODO: paroquiaId deve vir do usuário autenticado (guard), não do body —
// provisório até o módulo Auth existir (ver docs/arquitetura.md, seção 1).
export class CreateFichaDto {
  @IsUUID()
  paroquiaId!: string;

  // Identificação
  @IsString()
  @MinLength(3)
  nomeCompleto!: string;

  @IsDateString()
  dataNascimento!: string;

  @IsOptional() @IsString() naturalidade?: string;

  @IsString()
  telefone!: string;

  @EmptyToUndefined() @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() fotoUrl?: string;

  // Endereço
  @IsOptional() @IsString() logradouro?: string;
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() complemento?: string;
  @IsOptional() @IsString() bairro?: string;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() cep?: string;

  // Filiação
  @IsOptional() @IsString() nomePai?: string;
  @IsOptional() @IsString() nomeMae?: string;

  // Escolaridade
  @IsOptional() @IsString() grauEscolaridade?: string;
  @IsOptional() @IsString() curso?: string;
  @IsOptional() @IsString() instituicao?: string;
  @IsOptional() @IsString() situacaoEscolar?: string;

  // Religião
  @IsOptional() @IsString() religiao?: string;
  @IsOptional() @IsString() igrejaQueFrequenta?: string;
  @IsOptional() @IsBoolean() participaOutroMovimento?: boolean;
  @IsOptional() @IsString() qualMovimento?: string;
  @IsOptional() @IsBoolean() sacramentoBatismo?: boolean;
  @IsOptional() @IsBoolean() sacramentoEucaristia?: boolean;
  @IsOptional() @IsBoolean() sacramentoCrisma?: boolean;

  // Convite
  @IsOptional() @IsString() nomeConvidante?: string;
  @IsOptional() @IsString() telefoneConvidante?: string;
  @IsOptional() @IsString() enderecoConvidante?: string;

  @IsOptional() @IsString() observacoes?: string;

  @IsInt()
  @Min(1)
  numeroEncontro!: number;

  @IsEnum(CorCirculo)
  corCirculo!: CorCirculo;

  @IsOptional() @IsEnum(SituacaoFicha) situacao?: SituacaoFicha;
  @IsOptional() @IsString() motivoDesativacao?: string;

  // R3, Grupo B (módulo Montagem) — marcado manualmente até o Auth existir de verdade.
  @IsOptional() @IsBoolean() jaFoiEquipeDirigente?: boolean;
}
