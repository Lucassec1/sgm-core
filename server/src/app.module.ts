import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ParoquiasModule } from './modules/paroquias/paroquias.module';
import { FichasModule } from './modules/fichas/fichas.module';
import { FichasCasaisModule } from './modules/fichas-casais/fichas-casais.module';
import { MontagemModule } from './modules/montagem/montagem.module';
import { ConselhoModule } from './modules/conselho/conselho.module';
import { TelaoModule } from './modules/telao/telao.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ParoquiasModule,
    FichasModule,
    FichasCasaisModule,
    MontagemModule,
    ConselhoModule,
    TelaoModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
