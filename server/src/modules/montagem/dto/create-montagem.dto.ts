import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

// paroquiaId vem do usuário autenticado (@ParoquiaAtual(), ver montagens.controller.ts), não
// do body — R7.
// numeroEncontro NÃO entra aqui: é calculado na Service (max + 1 por paróquia).
export class CreateMontagemDto {
  @IsDateString()
  data!: string;

  @IsOptional() @IsString() padroeiro?: string;
  @IsOptional() @IsString() diretorEspiritual?: string;

  // Implantação: quantidadeJovensSementeira (12) e quantidadeCasaisAfilhada (4) NÃO vêm do
  // body — a Service preenche com os valores fixos quando ehImplantacao = true (ver R6).
  @IsOptional() @IsBoolean() ehImplantacao?: boolean;
  @IsOptional() @IsString() paroquiaAfilhadaNome?: string;

  @IsInt()
  @Min(1)
  numeroJovensVivenciando!: number;

  // R9 — quem fez a ação, pro log de atividade (sem Auth real ainda, digitado manualmente).
  @IsOptional() @IsString() usuario?: string;
}
