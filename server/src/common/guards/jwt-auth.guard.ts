import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// TODO: estratégia JWT (passport-jwt) — ver docs/arquitetura.md, seção 1.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
