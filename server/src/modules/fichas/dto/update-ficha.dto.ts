import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateFichaDto } from './create-ficha.dto';

// Todos os campos de CreateFichaDto viram opcionais, exceto paroquiaId (não muda no update).
export class UpdateFichaDto extends PartialType(
  OmitType(CreateFichaDto, ['paroquiaId'] as const),
) {}
