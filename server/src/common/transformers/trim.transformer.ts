import { Transform } from 'class-transformer';

// Tira espaços das pontas antes de validar — e-mail colado de outro lugar costuma vir com um
// espaço no fim, e o @IsEmail recusaria " paroquia@gmail.com ".
export function Trim() {
  return Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
}
