import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import {
  Badge,
  Card,
  Divider,
  EmptyState,
  InlineBanner,
  ListItem,
  Screen,
  SectionHeader,
  Spinner,
  Text,
  palette,
  spacing,
} from '../../../../src/design-system';
import {
  usePatient,
  usePatientMedications,
  useUpdatePatient,
} from '../../../../src/features/patients/hooks';
import { describeError } from '../../../../src/lib/errors';

export default function AdminPatientDetailScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const patient = usePatient(id);
  const meds = usePatientMedications(id);
  const update = useUpdatePatient(id ?? '');

  if (patient.isLoading) return <Screen><Spinner label="Loading patient…" /></Screen>;
  if (patient.isError) {
    return (
      <Screen>
        <InlineBanner tone="danger" title="Couldn’t load patient" description={describeError(patient.error)} />
      </Screen>
    );
  }
  if (!patient.data) return <Screen><Text>Not found.</Text></Screen>;

  const p = patient.data;
  const toggleEligibility = (next: boolean): void => {
    update.mutate({ eligibility340BAsserted: next });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="overline" tone="secondary">Patient</Text>
        <Text variant="heading">
          {p.firstName} {p.lastName}
        </Text>
        <Text variant="caption" tone="secondary">
          {p.email} · DOB {p.dateOfBirth}
        </Text>
      </View>

      <Card raised>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text variant="title">340B eligibility</Text>
            <Text variant="caption" tone="secondary" style={styles.cardBody}>
              Assert only when this patient meets your clinic’s 340B eligibility criteria.
            </Text>
          </View>
          <Switch
            value={p.eligibility340BAsserted}
            onValueChange={toggleEligibility}
            trackColor={{ true: palette.success500, false: palette.hairline }}
            disabled={update.isPending}
          />
        </View>
        {update.isError ? (
          <Text variant="caption" tone="danger" style={styles.errorLine}>
            {describeError(update.error)}
          </Text>
        ) : null}
        {p.eligibility340BAsserted ? (
          <Badge label="Asserted by your clinic" tone="success" style={styles.assertedBadge} />
        ) : null}
      </Card>

      <Card>
        <Text variant="title">Preferred pharmacy</Text>
        {p.preferredPharmacy ? (
          <>
            <Text variant="bodyStrong" style={styles.cardBody}>
              {p.preferredPharmacy.name}
            </Text>
            <Text variant="caption" tone="secondary">
              {p.preferredPharmacy.address1} · {p.preferredPharmacy.city}, {p.preferredPharmacy.state}
            </Text>
          </>
        ) : (
          <Text variant="body" tone="secondary" style={styles.cardBody}>
            None set.
          </Text>
        )}
      </Card>

      <SectionHeader
        label="Medications"
        action={
          <Pressable
            onPress={() => router.push({ pathname: '/(admin)/patients/[id]/assign', params: { id: p.id } })}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <View style={styles.actionRow}>
              <Feather name="plus" size={16} color={palette.primary500} />
              <Text variant="bodyStrong" tone="primary">Assign</Text>
            </View>
          </Pressable>
        }
      />

      {meds.isLoading ? (
        <Spinner />
      ) : meds.isError ? (
        <InlineBanner tone="warning" title="Couldn’t load medications" description={describeError(meds.error)} />
      ) : !meds.data || meds.data.length === 0 ? (
        <EmptyState
          title="No medications assigned"
          description="Tap Assign to add one."
          actionLabel="Assign a medication"
          onAction={() => router.push({ pathname: '/(admin)/patients/[id]/assign', params: { id: p.id } })}
        />
      ) : (
        <View style={styles.list}>
          {meds.data.map((m, idx) => (
            <View key={m.id}>
              <ListItem
                title={m.medication.displayName}
                subtitle={`${m.quantity} ${m.quantityUnit} · Assigned ${new Date(m.assignedAt).toLocaleDateString()} by ${m.assignedBy.displayName}`}
                showChevron={false}
              />
              {idx < meds.data!.length - 1 ? <Divider style={styles.divider} /> : null}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xxs, marginTop: spacing.md, marginBottom: spacing.sm },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardBody: { marginTop: spacing.xs },
  errorLine: { marginTop: spacing.sm },
  assertedBadge: { marginTop: spacing.sm },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  list: { gap: spacing.sm },
  divider: { marginVertical: spacing.xs },
});
