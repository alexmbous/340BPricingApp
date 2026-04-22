import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthActor } from '../types/auth-actor';

/** Resolves the authenticated AuthActor attached by JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthActor => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AuthActor;
  },
);
