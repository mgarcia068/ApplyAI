import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  me() {
    // MVP: placeholder
    return { ok: true };
  }
}
