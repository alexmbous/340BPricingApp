import { ForbiddenException } from '@nestjs/common';

import type { Role } from '@apexcare/shared-types';
import { Roles } from '@apexcare/shared-types';

import type { AuthActor } from '../types/auth-actor';

/**
 * Service-layer helper that translates an AuthActor into a Prisma `where`
 * fragment restricting queries to the actor's tenancy envelope.
 *
 *   - SUPER_ADMIN: no filter
 *   - PARENT_ADMIN: organization.parent_organization_id = actor.parentOrganizationId
 *   - ORG_ADMIN / PATIENT: organization_id = actor.organizationId
 *
 * Used as a consistent, auditable primary guardrail at the service boundary.
 * The Prisma extension (see prisma.service.ts) backs it up at the query layer.
 */
export type ScopedWhere =
  | Record<string, never>
  | { organizationId: string }
  | { organization: { parentOrganizationId: string } };

export function buildOrganizationScope(actor: AuthActor): ScopedWhere {
  switch (actor.role) {
    case Roles.SUPER_ADMIN:
      return {};
    case Roles.PARENT_ADMIN:
      if (!actor.parentOrganizationId) {
        throw new ForbiddenException('Parent admin missing parent organization');
      }
      return { organization: { parentOrganizationId: actor.parentOrganizationId } };
    case Roles.ORG_ADMIN:
    case Roles.PATIENT:
      if (!actor.organizationId) {
        throw new ForbiddenException('User missing organization');
      }
      return { organizationId: actor.organizationId };
    default:
      throw new ForbiddenException(`Unknown role: ${actor.role as string}`);
  }
}

export function canActOnOrganization(actor: AuthActor, organizationId: string): boolean {
  return actorCanReachOrganization(actor, organizationId, null);
}

export function actorCanReachOrganization(
  actor: AuthActor,
  organizationId: string,
  organizationParentId: string | null,
): boolean {
  if (actor.role === Roles.SUPER_ADMIN) return true;
  if (actor.role === Roles.PARENT_ADMIN) {
    return !!organizationParentId && organizationParentId === actor.parentOrganizationId;
  }
  return actor.organizationId === organizationId;
}

export function canActOnParentOrganization(actor: AuthActor, parentOrgId: string): boolean {
  if (actor.role === Roles.SUPER_ADMIN) return true;
  if (actor.role === Roles.PARENT_ADMIN) return actor.parentOrganizationId === parentOrgId;
  return false;
}

export function assertRole(actor: AuthActor, allowed: Role[]): void {
  if (!allowed.includes(actor.role)) {
    throw new ForbiddenException(`Role ${actor.role} not allowed here`);
  }
}
