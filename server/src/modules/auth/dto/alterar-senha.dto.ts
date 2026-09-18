import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AlterarSenhaDto {
  @IsString()
  @IsNotEmpty()
  senhaAtual!: string;

  @IsString()
  @MinLength(8)
  senhaNova!: string;
}
