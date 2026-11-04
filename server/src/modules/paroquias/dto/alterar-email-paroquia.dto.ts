import { IsEmail } from 'class-validator';
import { Trim } from '../../../common/transformers/trim.transformer';

export class AlterarEmailParoquiaDto {
  @Trim()
  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;
}
