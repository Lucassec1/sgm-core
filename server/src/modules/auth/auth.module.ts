import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

// Extraído pra variável — precisa ser a MESMA referência em `imports` e `exports` pro Nest
// tratar como o mesmo módulo dinâmico (JwtAuthGuard, registrado direto em app.module.ts,
// precisa do JwtService pra renovar o cookie a cada requisição — ver jwt-auth.guard.ts).
const jwtModule = JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.getOrThrow<string>('JWT_SECRET'),
    signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '12h' },
  }),
});

@Module({
  imports: [PassportModule, jwtModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, jwtModule],
})
export class AuthModule {}
