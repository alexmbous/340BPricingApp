import type { Role } from '../roles';

export interface AuditLogEntryDto {
  id: string;
  actorUserId: string | null;
  actorRole: Role | null;
  organizationId: string | null;
  parentOrganizationId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export const AUDIT_ACTIONS = {
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGIN_FAILED: 'auth.login.failed',
  AUTH_REFRESH: 'auth.refresh',
  AUTH_REFRESH_REUSE_DETECTED: 'auth.refresh.reuse_detected',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_PASSWORD_CHANGED: 'auth.password.changed',
  USER_CREATED: 'user.created',
  USER_DISABLED: 'user.disabled',
  PATIENT_CREATED: 'patient.created',
  PATIENT_UPDATED: 'patient.updated',
  PATIENT_ELIGIBILITY_ASSERTED: 'patient.eligibility.asserted',
  PATIENT_MEDICATION_ASSIGNED: 'patient.medication.assigned',
  PATIENT_MEDICATION_REMOVED: 'patient.medication.removed',
  MEDICATION_SEARCHED: 'medication.searched',
  PRICING_LOOKUP: 'pricing.lookup',
  ORGANIZATION_CREATED: 'organization.created',
  PARENT_ORGANIZATION_CREATED: 'parent_organization.created',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
