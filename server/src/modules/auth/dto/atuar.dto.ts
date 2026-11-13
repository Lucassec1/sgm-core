import { IsUUID } from 'class-validator';

export class AtuarDto {
  @IsUUID()
  implantacaoId!: string;
}
