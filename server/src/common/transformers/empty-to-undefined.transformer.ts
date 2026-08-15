import { Transform } from 'class-transformer';

// Campos opcionais de formulário (Input vazio) chegam como "" — @IsOptional() só pula a
// validação quando o valor é null/undefined, não string vazia. Sem isso, validadores de
// formato (@IsEmail, @IsDateString etc.) rejeitam um campo opcional deixado em branco.
export function EmptyToUndefined() {
  return Transform(({ value }) => (value === '' ? undefined : value));
}
