import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { StatusMontagem } from '@prisma/client';
import { CreateMontagemDto } from './create-montagem.dto';

// numeroEncontro nunca muda depois de criado; paroquiaId também não.
export class UpdateMontagemDto extends PartialType(
  OmitType(CreateMontagemDto, ['paroquiaId'] as const),
) {
  @IsOptional() @IsEnum(StatusMontagem) status?: StatusMontagem;
}
