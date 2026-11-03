import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetCredenciaisDto {
  @IsString()
  @MinLength(8)
  senha!: string;

  // Novo e-mail de recuperação. Sem ele, o reset LIMPA o e-mail atual — reset pelo Conselho
  // costuma ser virada de equipe, e o e-mail antigo pode ser de quem saiu.
  @IsOptional()
  @IsEmail()
  emailRecuperacao?: string;
}
