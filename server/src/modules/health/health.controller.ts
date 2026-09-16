import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaHealthIndicator } from './prisma.health-indicator';

// Health check (docs/producao.md, seção "Importantes" — "nenhum jeito de saber que o sistema
// caiu, a não ser alguém reclamar"). Público: um monitor externo não tem sessão pra autenticar.
@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.prismaIndicator.isHealthy('database')]);
  }
}
