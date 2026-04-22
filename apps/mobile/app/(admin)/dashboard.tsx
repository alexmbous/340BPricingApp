import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  InlineBanner,
  Screen,
  SectionHeader,
  Spinner,
  Text,
  spacing,
} from '../../src/design-system';
import { useAuditLog } from '../../src/features/audit/hooks';
import { usePatientsList } from '../../src/features/patients/hooks';
import { humanAction } from '../../src/features/audit/action-labels';
import { describeError } from '../../src/lib/errors';
import { useAuthStore } from '../../src/state/auth';

export default function AdminDashboardScreen(): React.ReactElement {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const orgId = user?.organizationId ?? null;
  const patients = usePatientsList(orgId, '');
  const audit = useAuditLog({});

  const patientCount = patients.data?.items.length ?? 0;
  const assertedCount = patients.data?.items.filter((p) => p.eligibility340BAsserted).length ?? 0;
  const recent = audit.data?.items.slice(0, 4) ?? [];

  return (
    <Screen>
      <View style={styles.hero}>
        <Text variant="overline" tone="secondary">Clinic admin</Text>
        <Text variant="heading">{user?.displayName ?? 'Welcome'}</Text>
      </View>

      <View style={styles.kpiRow}>
        <Kpi label="Patients" value={patients.isLoading ? '—' : String(patientCount)} />
        <Kpi label="340B-eligible" value={patients.isLoading ? '—' : String(assertedCount)} />
      </View>

      <Card raised>
        <Text variant="title">Add a new patient</Text>
        <Text variant="body" tone="secondary" style={styles.cardBody}>
          Create a patient account and assign medications.
        </Text>
        <Button
          label="New patient"
          onPress={() => router.push('/(admin)/patients/new')}
          style={styles.cta}
          fullWidth
        />
      </Card>

      <SectionHeader label="Recent activity" />
      {audit.isLoading ? (
        <Spinner />
      ) : audit.isError ? (
        <InlineBanner tone="warning" title="Couldn’t load activity" description={describeError(audit.error)} />
      ) : recent.length === 0 ? (
        <Card>
          <Text variant="body" tone="secondary">No activity yet.</Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {recent.map((e) => (
            <Card key={e.id}>
              <View style={styles.rowTop}>
                <Text variant="bodyStrong">{humanAction(e.action)}</Text>
                {e.actorRole ? <Badge label={e.actorRole} tone="neutral" /> : null}
              </View>
              <Text variant="caption" tone="secondary" style={styles.rowLine}>
                {new Date(e.createdAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

function Kpi({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <Card style={styles.kpi}>
      <Text variant="caption" tone="secondary">{label}</Text>
      <Text variant="display" style={styles.kpiValue}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.sm },
  kpiRow: { flexDirection: 'row', gap: spacing.md },
  kpi: { flex: 1 },
  kpiValue: { marginTop: 2 },
  cardBody: { marginTop: spacing.xs },
  cta: { marginTop: spacing.md },
  list: { gap: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLine: { marginTop: spacing.xxs },
});
