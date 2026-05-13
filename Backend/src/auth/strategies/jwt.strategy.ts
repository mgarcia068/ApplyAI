import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AppConfigService } from '../../config/app-config.service';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(appConfig: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Si no está seteado, no validamos tokens correctamente.
      // Dejamos un valor dummy para no romper el bootstrap en dev.
      secretOrKey: appConfig.jwtSecret ?? '__MISSING_JWT_SECRET__',
    });
  }

  validate(payload: JwtPayload) {
    // Se expone como req.user
    return payload;
  }
}
