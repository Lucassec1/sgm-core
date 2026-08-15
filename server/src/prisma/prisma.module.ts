import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() para não precisar importar PrismaModule em cada módulo de feature.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
