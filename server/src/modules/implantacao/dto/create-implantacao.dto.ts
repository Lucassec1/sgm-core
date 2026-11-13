import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { Trim } from '../../../common/transformers/trim.transformer';

export class CreateImplantacaoDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  afilhadaNome!: string;

  @IsUUID()
  madrinhaId!: string;
}
