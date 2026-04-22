import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { AuditLogEntryDto } from '@apexcare/shared-types';

import { PrismaService } from '../../prisma/prisma.service';
import { buildOrganizationScope } from '../../common/tenancy/tenant-scope';
import type { AuthActor } from '../../common/types/auth-actor';
import { clampLimit } from '../../common/pipes/cursor.util';

export interface WriteAuditInput {
  actorUserId: string | null;
  actorRole: AuthActor['role'] | null;
  organizationId: string | null;
  parentOrganizationId: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async write(input: WriteAuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          actorRole: input.actorRole ?? undefined,
          organizationId: input.organizationId,
          parentOrganizationId: input.parentOrganizationId,
          action: input.action,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          metadata: input.metadata
            ? (sanitize(input.metadata) as Prisma.InputJsonValue)
            : undefined,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          requestId: input.requestId,
        },
      });
    } catch (err) {
      // Audit must never break the main request flow. Log loudly.
      this.logger.error({ err, action: input.action }, 'Failed to write audit log');
    }
  }

  async list(
    actor: AuthActor,
    params: {
      actorUserId?: string;
      action?: string;
      from?: Date;
      to?: Date;
      cursor?: string;
      limit?: number;
    },
  ): Promise<{ items: AuditLogEntryDto[]; nextCursor: string | null; limit: number }> {
    const limit = clampLimit(params.limit);
    const scope = buildOrganizationScope(actor);
    const scopeWhere: { organizationId?: string } = {};
    if ('organizationId' in scope) scopeWhere.organizationId = scope.organizationId;
    // PARENT_ADMIN can't be expressed via audit.organizationId directly; we
    // filter using the parent chain below for that role.

    const where: Record<string, unknown> = {
      ...(params.actorUserId && { actorUserId: params.actorUserId }),
      ...(params.action && { action: params.action }),
      ...((params.from || params.to) && {
        createdAt: {
          ...(params.from && { gte: params.from }),
          ...(params.to && { lte: params.to }),
        },
      }),
      ...scopeWhere,
    };

    if (actor.role === 'PARENT_ADMIN' && actor.parentOrganizationId) {
      where.parentOrganizationId = actor.parentOrganizationId;
    }

    const rows = await this.prisma.auditLog.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      ...(params.cursor && { cursor: { id: params.cursor }, skip: 1 }),
    });

    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(
      (r): AuditLogEntryDto => ({
        id: r.id,
        actorUserId: r.actorUserId,
        actorRole: r.actorRole,
        organizationId: r.organizationId,
        parentOrganizationId: r.parentOrganizationId,
        action: r.action,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        metadata: (r.metadata as Record<string, unknown> | null) ?? null,
        ipAddress: r.ipAddress,
        createdAt: r.createdAt.toISOString(),
      }),
    );
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
      limit,
    };
  }
}

// Strip keys that commonly carry PHI or credentials. Called defensively on
// all metadata written to audit rows.
const FORBIDDEN_KEYS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'ssn',
  'dob',
  'dateOfBirth',
  'email',
  'firstName',
  'lastName',
  'lat',
  'lng',
  'address1',
  'phone',
  'notes',
]);

function sanitize<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((x) => sanitize(x)) as unknown as T;
  if (typeof obj !== 'object') return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(k)) continue;
    out[k] = sanitize(v);
  }
  return out as T;
}
