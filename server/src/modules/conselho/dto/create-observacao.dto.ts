import { IsNotEmpty, IsString } from 'class-validator';

export class CreateObservacaoDto {
  @IsString()
  @IsNotEmpty()
  texto!: string;
}
