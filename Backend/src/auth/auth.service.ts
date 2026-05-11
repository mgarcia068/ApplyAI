import { Injectable } from '@nestjs/common';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  register(dto: RegisterDto) {
    // MVP: solo estructura. La lógica real (hash, prisma, jwt) va en el siguiente paso.
    return { ok: true, action: 'register', dto };
  }

  login(dto: LoginDto) {
    // MVP: solo estructura. La lógica real (validate user + sign jwt) va en el siguiente paso.
    return { ok: true, action: 'login', dto };
  }
}
