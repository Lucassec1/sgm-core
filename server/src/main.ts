import './instrument';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

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
  // reflete qualquer origem — cômodo pra dev local (tudo no docker-compose), mas
  // CORS_ORIGINS deve ser definido assim que o client for servido de um domínio real.
  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origem) => origem.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

  // Contrato de API (docs/code-review.md, checklist de hardening) — documentação gerada a
  // partir dos DTOs (class-validator, via plugin do nest-cli.json) e dos controllers. Sem
  // proteção de acesso por enquanto: mesmo estágio do resto do sistema (uso interno, sem
  // Auth real ainda — ver "Isolamento por paróquia" no CLAUDE.md).
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

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
