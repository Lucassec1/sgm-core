import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EquipesService } from './equipes.service';

@ApiTags('equipes')
@Controller('equipes')
export class EquipesController {
  constructor(private readonly equipesService: EquipesService) {}

  @Get()
  findAll() {
    return this.equipesService.findAll();
  }
}
