import { Injectable } from '@nestjs/common';

import { JwtPayload } from '../auth/types/jwt-payload.type';

@Injectable()
export class UsersService {
  me(user: JwtPayload) {
    return { user };
  }
}
