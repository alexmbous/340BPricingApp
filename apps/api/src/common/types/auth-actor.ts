import type { Role } from '@apexcare/shared-types';

/**
 * The authenticated actor attached to request.user by JwtAuthGuard.
 * All downstream services should accept this and resolve tenancy from it.
 */
export interface AuthActor {
  userId: string;
  role: Role;
  email: string;
  parentOrganizationId: string | null;
  organizationId: string | null;
  jti: string;
}
