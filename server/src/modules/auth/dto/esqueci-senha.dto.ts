import { IsNotEmpty, IsString } from 'class-validator';

export class EsqueciSenhaDto {
  @IsString()
  @IsNotEmpty()
  login!: string;
}
