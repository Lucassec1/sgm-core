import { PartialType } from '@nestjs/mapped-types';
import { CreateFichaCasalDto } from './create-ficha-casal.dto';

export class UpdateFichaCasalDto extends PartialType(CreateFichaCasalDto) {}
