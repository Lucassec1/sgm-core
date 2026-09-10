import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
