import { Controller, Get } from '@nestjs/common';
import { EquipesService } from './equipes.service';

@Controller('equipes')
export class EquipesController {
  constructor(private readonly equipesService: EquipesService) {}

  @Get()
  findAll() {
    return this.equipesService.findAll();
  }
}
