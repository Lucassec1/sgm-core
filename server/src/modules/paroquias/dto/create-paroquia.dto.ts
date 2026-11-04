import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Trim } from '../../../common/transformers/trim.transformer';

// Criação de paróquia + conta de acesso, feita pelo Conselho (R7/R8) — ver
// docs/regras-imutaveis.md, R7 ("cada paróquia tem sua própria equipe dirigente, login próprio").
// Sem senha: a própria paróquia cria no primeiro acesso, pelo link enviado a esse e-mail.
export class CreateParoquiaDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @Trim()
  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;
}
