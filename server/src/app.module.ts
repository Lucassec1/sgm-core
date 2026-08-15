import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ParoquiasModule } from './modules/paroquias/paroquias.module';
import { FichasModule } from './modules/fichas/fichas.module';
import { FichasCasaisModule } from './modules/fichas-casais/fichas-casais.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ParoquiasModule,
    FichasModule,
    FichasCasaisModule,
  ],
})
export class AppModule {}
