import { IsString, MinLength } from 'class-validator';

export class ResetCredenciaisDto {
  @IsString()
  @MinLength(8)
  senha!: string;
}
