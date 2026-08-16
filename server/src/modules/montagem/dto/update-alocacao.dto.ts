import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { StatusConvite } from '@prisma/client';
import { EmptyToUndefined } from '../../../common/transformers/empty-to-undefined.transformer';

export class UpdateAlocacaoDto {
  @IsOptional() @IsEnum(StatusConvite) status?: StatusConvite;
  @IsOptional() @IsDateString() dataConvite?: string;
  @IsOptional() @IsDateString() dataResposta?: string;
  @IsOptional() @IsString() motivoRecusa?: string;

  @IsOptional() @IsBoolean() podeCoordenar?: boolean;
  @IsOptional() @IsBoolean() podePalestrar?: boolean;
  @IsOptional() @IsString() observacoesAvaliacao?: string;

  @EmptyToUndefined() @IsOptional() @IsUUID() substituidaPorId?: string;

  // R9 — quem fez a ação, pro log de atividade (sem Auth real ainda, digitado manualmente).
  @IsOptional() @IsString() usuario?: string;
}
