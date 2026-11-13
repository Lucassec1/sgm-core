import { IsOptional, IsUUID } from 'class-validator';

export class LiberarFichaDto {
  @IsOptional() @IsUUID() fichaId?: string;
  @IsOptional() @IsUUID() fichaCasalId?: string;
}
