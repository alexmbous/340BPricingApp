import { SetMetadata } from '@nestjs/common';

export const TENANT_SCOPE_KEY = 'tenantScope';

/**
 * Describes how a route's tenant target is extracted from the request.
 * The TenantScopeGuard reads this and validates that the authenticated
 * actor's tenancy envelope covers the target.
 *
 * Examples:
 *   @TenantScope({ organizationParam: 'organizationId' })
 *   @TenantScope({ patientParam: 'id' })              // loads org via patient
 *   @TenantScope({ parentOrganizationParam: 'id' })
 */
export interface TenantScopeOptions {
  organizationParam?: string;
  parentOrganizationParam?: string;
  /**
   * Name of a route parameter that identifies a patient. The guard will
   * resolve the patient's organizationId server-side before comparing
   * against the actor's envelope.
   */
  patientParam?: string;
  /** Allow SUPER_ADMIN to bypass scoping. Default: true. */
  superAdminBypass?: boolean;
}

export const TenantScope = (opts: TenantScopeOptions): MethodDecorator & ClassDecorator =>
  SetMetadata(TENANT_SCOPE_KEY, opts);
