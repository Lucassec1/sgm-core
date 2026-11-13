import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

// paroquiaId vem do usuário autenticado (@ParoquiaAtual(), ver montagens.controller.ts), não
// do body — R7.
// numeroEncontro NÃO entra aqui: é calculado na Service (max + 1 por paróquia).
export class CreateMontagemDto {
  @IsDateString()
  data!: string;

  @IsOptional() @IsString() padroeiro?: string;
  @IsOptional() @IsString() diretorEspiritual?: string;

  // Sementeira (R6): encontro da madrinha que recebe jovens da afilhada. A quantidade de jovens é
  // 12 por padrão e pode ser menor (desistências); os 4 casais da afilhada na Visitação são fixos
  // e a Service preenche. O vínculo, se informado, tem que estar na fase Sementeira.
  @IsOptional() @IsBoolean() recebeSementeira?: boolean;
  @IsOptional() @IsUUID() sementeiraDeImplantacaoId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(12) quantidadeJovensSementeira?: number;

  @IsInt()
  @Min(1)
  numeroJovensVivenciando!: number;

  // R9 — quem fez a ação, pro log de atividade (sem Auth real ainda, digitado manualmente).
  @IsOptional() @IsString() usuario?: string;
}
