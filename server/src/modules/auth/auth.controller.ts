import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';

// TODO: endpoint de login (JWT por paróquia) — ver docs/arquitetura.md, seção 1.
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
