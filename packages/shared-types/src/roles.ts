export const Roles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PARENT_ADMIN: 'PARENT_ADMIN',
  ORG_ADMIN: 'ORG_ADMIN',
  PATIENT: 'PATIENT',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export const ADMIN_ROLES: readonly Role[] = [
  Roles.SUPER_ADMIN,
  Roles.PARENT_ADMIN,
  Roles.ORG_ADMIN,
];

export const ALL_ROLES: readonly Role[] = [...ADMIN_ROLES, Roles.PATIENT];

export function isAdminRole(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}
