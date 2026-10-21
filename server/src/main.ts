import './instrument';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { verificarOrigem } from './common/auth/origem.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Em produção (Render) a requisição chega via um proxy — sem isso req.ip seria o IP do proxy
  // e o rate limit (ThrottlerGuard) contaria todo mundo como um IP só.
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // contentSecurityPolicy desligada: essa API não serve HTML pro navegador do usuário final
  // (o client Next.js é servido separado) — CSP existe pra proteger página renderizada, não
  // faz sentido aqui e bloquearia os assets do Swagger UI em /docs sem trazer proteção real.
  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Allow-list de origens via env (CORS_ORIGINS, separadas por vírgula). Sem a env,
  // reflete qualquer origem — cômodo pra dev local (tudo no docker-compose). Em produção a
  // env é obrigatória: refletir qualquer origem com credentials deixaria qualquer site ler os
  // dados de quem estiver logado.
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV === 'production' && corsOrigins.length === 0) {
    throw new Error('CORS_ORIGINS é obrigatório em produção (ver docs/deploy.md)');
  }
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });
  app.use(verificarOrigem(corsOrigins));

  // Contrato de API (docs/historico/code-review.md, checklist de hardening) — documentação gerada a
  // partir dos DTOs (class-validator, via plugin do nest-cli.json) e dos controllers. Só liga fora
  // de produção: expõe o mapa completo de rotas e não tem proteção de acesso, e o sistema guarda
  // dado sensível (inclusive de menores). Em produção /docs e /docs-json respondem 404.
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SGM Core API')
      .setDescription('API do Segue-me (Fichas + Montagem), diocese de Crato.')
      .setVersion('1.0')
      .addTag('fichas', 'Ficha do Jovem')
      .addTag('fichas-casais', 'Ficha do Casal')
      .addTag('montagens')
      .addTag('equipes')
      .addTag('alocacoes', 'Alocação de pessoas nas vagas da Montagem (R1-R9)')
      .addTag('lista-substituicao')
      .addTag('quadrantes')
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument);
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
