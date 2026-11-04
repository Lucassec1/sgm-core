import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  login!: string;

  // Pode vir vazia: no primeiro acesso a conta ainda não tem senha, e tentar entrar só com o
  // e-mail é o que dispara o link de criar senha (AuthService.validarUsuario).
  @IsString()
  senha!: string;
}
