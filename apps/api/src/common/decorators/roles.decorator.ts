import { SetMetadata } from '@nestjs/common';

import type { Role } from '@apexcare/shared-types';

export const ROLES_KEY = 'roles';

/** Restrict a route (or controller) to a set of roles. */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
