import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AlterarEmailRecuperacaoDto {
  @IsString()
  @IsNotEmpty()
  senhaAtual!: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;
}
