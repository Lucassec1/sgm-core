import { Controller } from '@nestjs/common';
import { ParoquiasService } from './paroquias.service';

// TODO: CRUD de paróquias — cadastro é responsabilidade do conselho (docs/requisitos.md, seção 6).
@Controller('paroquias')
export class ParoquiasController {
  constructor(private readonly paroquiasService: ParoquiasService) {}
}
