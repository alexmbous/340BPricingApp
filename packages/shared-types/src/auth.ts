import { z } from 'zod';

import type { Role } from './roles';

export interface AuthUserSummary {
  id: string;
  email: string;
  role: Role;
  parentOrganizationId: string | null;
  organizationId: string | null;
  displayName: string;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string; // ISO
  refreshTokenExpiresAt: string; // ISO
}

export interface LoginResponse extends AuthTokenPair {
  user: AuthUserSummary;
}

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  deviceLabel: z.string().max(100).optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(10),
});
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10).max(200),
});
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
