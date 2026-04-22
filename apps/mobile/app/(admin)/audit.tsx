import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { AuditLogEntryDto } from '@apexcare/shared-types';

import {
  Badge,
  Card,
  EmptyState,
  InlineBanner,
  Screen,
  SectionHeader,
  Spinner,
  Text,
  palette,
  radius,
  spacing,
} from '../../src/design-system';
import { useAuditLog } from '../../src/features/audit/hooks';
import { AUDIT_FILTERS, humanAction } from '../../src/features/audit/action-labels';
import { describeError } from '../../src/lib/errors';

export default function AdminAuditScreen(): React.ReactElement {
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);
  const audit = useAuditLog({ action: actionFilter });

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="overline" tone="secondary">Audit log</Text>
        <Text variant="heading">Recent activity</Text>
        <Text variant="caption" tone="tertiary">Scoped to your tenancy.</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {AUDIT_FILTERS.map((f) => {
          const active = f.value === actionFilter;
          return (
            <Pressable
              key={f.label}
              onPress={() => setActionFilter(f.value)}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text variant="caption" tone={active ? 'onPrimary' : 'secondary'}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {audit.isLoading ? <Spinner /> : null}
      {audit.isError ? (
        <InlineBanner tone="danger" title="Couldn’t load audit log" description={describeError(audit.error)} />
      ) : null}

      {audit.data ? (
        audit.data.items.length === 0 ? (
          <EmptyState title="No matching entries" description="Try a different filter or expand the time range." />
        ) : (
          <View style={{ gap: spacing.md }}>
            <SectionHeader label={`${audit.data.items.length} entries`} />
            {audit.data.items.map((e) => (
              <AuditRow key={e.id} entry={e} />
            ))}
          </View>
        )
      ) : null}
    </Screen>
  );
}

function AuditRow({ entry }: { entry: AuditLogEntryDto }): React.ReactElement {
  const when = useMemo(() => formatTimestamp(entry.createdAt), [entry.createdAt]);
  const meta = entry.metadata ?? null;
  const summary = summarize(entry);
  return (
    <Card>
      <View style={styles.rowTop}>
        <Text variant="bodyStrong">{humanAction(entry.action)}</Text>
        {entry.actorRole ? <Badge label={entry.actorRole} tone="neutral" /> : null}
      </View>
      <Text variant="caption" tone="secondary" style={styles.rowLine}>
        {summary}
      </Text>
      <Text variant="caption" tone="tertiary" style={styles.rowLine}>
        {when}
        {meta && typeof meta.path === 'string' ? ` · ${meta.path as string}` : ''}
      </Text>
    </Card>
  );
}

function summarize(e: AuditLogEntryDto): string {
  const parts: string[] = [];
  if (e.resourceType) parts.push(e.resourceType);
  if (e.resourceId) parts.push(`#${e.resourceId.slice(0, 10)}`);
  if (e.actorUserId) parts.push(`actor ${e.actorUserId.slice(0, 10)}`);
  const m = e.metadata as Record<string, unknown> | null;
  if (m && typeof m.method === 'string') parts.push(m.method as string);
  return parts.join(' · ') || '—';
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  header: { gap: spacing.xxs, marginTop: spacing.md, marginBottom: spacing.sm },
  filterRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.surface,
  },
  chipActive: { backgroundColor: palette.primary500, borderColor: palette.primary500 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowLine: { marginTop: spacing.xxs },
});
