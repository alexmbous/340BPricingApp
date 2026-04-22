import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AppConfigService } from '../../../config/app-config.service';
import type { AuthActor } from '../../../common/types/auth-actor';
import type { AccessTokenClaims } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtAccessSecret,
    });
  }

  async validate(payload: AccessTokenClaims): Promise<AuthActor> {
    return {
      userId: payload.sub,
      role: payload.role,
      email: payload.email,
      parentOrganizationId: payload.parentOrganizationId,
      organizationId: payload.organizationId,
      jti: payload.jti,
    };
  }
}
