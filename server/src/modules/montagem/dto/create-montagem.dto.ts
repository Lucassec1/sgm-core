import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { EmptyToUndefined } from '../../../common/transformers/empty-to-undefined.transformer';

// TODO: paroquiaId deve vir do usuário autenticado (guard), não do body —
// provisório até o módulo Auth existir (ver docs/arquitetura.md, seção 1).
// numeroEncontro NÃO entra aqui: é calculado na Service (max + 1 por paróquia).
export class CreateMontagemDto {
  @IsUUID()
  paroquiaId!: string;

  @IsDateString()
  data!: string;

  @IsOptional() @IsString() padroeiro?: string;
  @IsOptional() @IsString() diretorEspiritual?: string;

  @IsOptional() @IsBoolean() ehSementeira?: boolean;
  @EmptyToUndefined() @IsOptional() @IsUUID() paroquiaSementeiraId?: string;
  @IsOptional() @IsInt() @Min(1) quantidadeFichasSementeira?: number;

  @IsInt()
  @Min(1)
  numeroJovensVivenciando!: number;

  // R9 — quem fez a ação, pro log de atividade (sem Auth real ainda, digitado manualmente).
  @IsOptional() @IsString() usuario?: string;
}
