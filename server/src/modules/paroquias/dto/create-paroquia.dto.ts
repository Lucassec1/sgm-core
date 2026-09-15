import { IsNotEmpty, IsString, MinLength } from 'class-validator';

// Criação de paróquia + credencial inicial, feita pelo Conselho (R7/R8) — ver
// docs/regras-imutaveis.md, R7 ("cada paróquia tem sua própria equipe dirigente, login próprio").
export class CreateParoquiaDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsString()
  @IsNotEmpty()
  login!: string;

  @IsString()
  @MinLength(8)
  senha!: string;
}
