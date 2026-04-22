import { AUDIT_ACTIONS, type AuditAction } from '@apexcare/shared-types';

export type AuditFilterOption = { label: string; value: string | undefined };

export const AUDIT_FILTERS: AuditFilterOption[] = [
  { label: 'All actions', value: undefined },
  { label: 'Sign-ins', value: AUDIT_ACTIONS.AUTH_LOGIN },
  { label: 'Patient created', value: AUDIT_ACTIONS.PATIENT_CREATED },
  { label: 'Medication assigned', value: AUDIT_ACTIONS.PATIENT_MEDICATION_ASSIGNED },
  { label: 'Medication searches', value: AUDIT_ACTIONS.MEDICATION_SEARCHED },
  { label: 'Pricing lookups', value: AUDIT_ACTIONS.PRICING_LOOKUP },
  { label: 'Eligibility asserted', value: AUDIT_ACTIONS.PATIENT_ELIGIBILITY_ASSERTED },
];

const ACTION_LABELS: Partial<Record<AuditAction, string>> = {
  [AUDIT_ACTIONS.AUTH_LOGIN]: 'Signed in',
  [AUDIT_ACTIONS.AUTH_LOGOUT]: 'Signed out',
  [AUDIT_ACTIONS.AUTH_REFRESH]: 'Token refreshed',
  [AUDIT_ACTIONS.AUTH_PASSWORD_CHANGED]: 'Password changed',
  [AUDIT_ACTIONS.USER_CREATED]: 'User created',
  [AUDIT_ACTIONS.PATIENT_CREATED]: 'Patient created',
  [AUDIT_ACTIONS.PATIENT_UPDATED]: 'Patient updated',
  [AUDIT_ACTIONS.PATIENT_MEDICATION_ASSIGNED]: 'Medication assigned',
  [AUDIT_ACTIONS.PATIENT_MEDICATION_REMOVED]: 'Medication removed',
  [AUDIT_ACTIONS.MEDICATION_SEARCHED]: 'Medication searched',
  [AUDIT_ACTIONS.PRICING_LOOKUP]: 'Pricing lookup',
  [AUDIT_ACTIONS.ORGANIZATION_CREATED]: 'Organization created',
  [AUDIT_ACTIONS.PARENT_ORGANIZATION_CREATED]: 'Parent org created',
};

export function humanAction(action: string): string {
  return ACTION_LABELS[action as AuditAction] ?? action;
}
