import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { StatusMontagem } from '@prisma/client';
import { CreateMontagemDto } from './create-montagem.dto';

// numeroEncontro nunca muda depois de criado; paroquiaId também não (vem do token, nem chega
// a existir no CreateMontagemDto).
export class UpdateMontagemDto extends PartialType(CreateMontagemDto) {
  @IsOptional() @IsEnum(StatusMontagem) status?: StatusMontagem;
}
