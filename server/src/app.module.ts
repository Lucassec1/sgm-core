import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { SentryModule } from '@sentry/nestjs/setup';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ParoquiasModule } from './modules/paroquias/paroquias.module';
import { FichasModule } from './modules/fichas/fichas.module';
import { FichasCasaisModule } from './modules/fichas-casais/fichas-casais.module';
import { MontagemModule } from './modules/montagem/montagem.module';
import { ConselhoModule } from './modules/conselho/conselho.module';
import { TelaoModule } from './modules/telao/telao.module';
import { HealthModule } from './modules/health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Sentry.init roda em src/instrument.ts (precisa ser importado antes de tudo em main.ts) —
    // SentryModule.forRoot() só liga a instrumentação automática do Nest (interceptors etc.),
    // e é um no-op seguro sem SENTRY_DSN configurado.
    SentryModule.forRoot(),
    // Log estruturado (JSON em produção, formatado em dev) — docs/producao.md, "Importantes".
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
      },
    }),
    // Rate limiting básico (100 req/IP/min) — API interna de baixo tráfego, só uma barreira
    // contra abuso óbvio, não um limite pensado pra escala.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    ParoquiasModule,
    FichasModule,
    FichasCasaisModule,
    MontagemModule,
    ConselhoModule,
    TelaoModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
