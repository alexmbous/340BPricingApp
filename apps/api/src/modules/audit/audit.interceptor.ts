import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { Observable, tap } from 'rxjs';

import { AUDIT_META_KEY, type AuditOptions } from '../../common/decorators/audit.decorator';
import type { AuthActor } from '../../common/types/auth-actor';

import { AuditService } from './audit.service';

/**
 * Writes an AuditLog row for every controller handler decorated with
 * @Audit({ action: '...' }). The handler stays pure — audit is a concern
 * handled entirely at this boundary.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
    private readonly cls: ClsService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const opts = this.reflector.get<AuditOptions | undefined>(AUDIT_META_KEY, ctx.getHandler());
    if (!opts) return next.handle();

    const req = ctx.switchToHttp().getRequest<{
      user?: AuthActor;
      params: Record<string, string>;
      body: Record<string, unknown>;
      url: string;
      method: string;
      id?: string;
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
    }>();

    return next.handle().pipe(
      tap({
        next: (result: unknown) => {
          void this.write(opts, req, result, true);
        },
        error: (err: unknown) => {
          if (opts.onlyOnSuccess) return;
          void this.write(opts, req, { error: (err as Error).message }, false);
        },
      }),
    );
  }

  private async write(
    opts: AuditOptions,
    req: {
      user?: AuthActor;
      params: Record<string, string>;
      body: Record<string, unknown>;
      url: string;
      method: string;
      id?: string;
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
    },
    result: unknown,
    success: boolean,
  ): Promise<void> {
    const actor = req.user ?? null;
    const resourceId =
      pickId(req.params, 'id') ??
      pickId(req.body as Record<string, unknown>, 'id') ??
      pickId(result as Record<string, unknown>, 'id');

    const metadata: Record<string, unknown> = {
      method: req.method,
      path: stripQuery(req.url),
      success,
    };
    if (req.body && typeof req.body === 'object') {
      metadata.bodyKeys = Object.keys(req.body);
    }

    const userAgent = (req.headers['user-agent'] as string | undefined) ?? this.cls.get('userAgent');

    await this.audit.write({
      actorUserId: actor?.userId ?? null,
      actorRole: actor?.role ?? null,
      organizationId: actor?.organizationId ?? null,
      parentOrganizationId: actor?.parentOrganizationId ?? null,
      action: opts.action,
      resourceType: opts.resourceType,
      resourceId: resourceId ?? undefined,
      metadata,
      ipAddress: req.ip ?? this.cls.get('ip'),
      userAgent,
      requestId: req.id ?? this.cls.getId(),
    });
  }
}

function pickId(obj: Record<string, unknown> | null | undefined, key: string): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const v = obj[key];
  return typeof v === 'string' ? v : undefined;
}

function stripQuery(url: string): string {
  const i = url.indexOf('?');
  return i >= 0 ? url.slice(0, i) : url;
}
