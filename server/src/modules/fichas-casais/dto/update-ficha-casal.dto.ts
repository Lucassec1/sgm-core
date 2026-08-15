import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateFichaCasalDto } from './create-ficha-casal.dto';

// Todos os campos de CreateFichaCasalDto viram opcionais, exceto paroquiaId (não muda no update).
export class UpdateFichaCasalDto extends PartialType(
  OmitType(CreateFichaCasalDto, ['paroquiaId'] as const),
) {}
