import type { AuditAction } from '@apexcare/shared-types';
import { SetMetadata } from '@nestjs/common';

export const AUDIT_META_KEY = 'audit:action';

export interface AuditOptions {
  action: AuditAction | string;
  /**
   * Pick the resource id from params/body/response. If omitted, the
   * interceptor tries sensible defaults (params.id, body.id, response.id).
   */
  resourceType?: string;
  /** Skip audit when the request fails. Default: false (we audit failures too). */
  onlyOnSuccess?: boolean;
}

/**
 * Attach audit metadata to a controller handler. The AuditInterceptor
 * writes an AuditLog row for every invocation.
 */
export const Audit = (opts: AuditOptions): MethodDecorator => SetMetadata(AUDIT_META_KEY, opts);
