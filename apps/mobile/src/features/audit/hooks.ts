import { useQuery } from '@tanstack/react-query';

import type { AuditLogEntryDto, Page } from '@apexcare/shared-types';

import { api } from '../../lib/api-client';

export interface AuditFilter {
  action?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
}

export const auditKey = (filter: AuditFilter) => ['audit', filter] as const;

export function useAuditLog(filter: AuditFilter) {
  return useQuery<Page<AuditLogEntryDto>>({
    queryKey: auditKey(filter),
    queryFn: () =>
      api.listAudit({
        action: filter.action,
        actorUserId: filter.actorUserId,
        from: filter.from,
        to: filter.to,
        limit: 30,
      }),
    staleTime: 15_000,
  });
}
