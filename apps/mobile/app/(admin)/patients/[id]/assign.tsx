import { DRUG_FORM_LABEL, type MedicationDto } from '@apexcare/shared-types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';


import {
  Badge,
  Button,
  Card,
  EmptyState,
  InlineBanner,
  ListItem,
  Screen,
  SearchInput,
  SectionHeader,
  Spinner,
  Text,
  TextInput,
  palette,
  radius,
  spacing,
} from '../../../../src/design-system';
import { useMedicationSearch } from '../../../../src/features/medication-search/hooks';
import { useAssignMedication } from '../../../../src/features/patients/hooks';
import { useDebounced } from '../../../../src/lib/debounce';
import { describeError } from '../../../../src/lib/errors';

export default function AssignMedicationScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const patientId = id ?? '';
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<MedicationDto | null>(null);
  const [quantity, setQuantity] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const debounced = useDebounced(query, 300);
  const search = useMedicationSearch(debounced);
  const assign = useAssignMedication(patientId);

  // When a drug is picked, pre-select its default quantity.
  useEffect(() => {
    if (selected) setQuantity(selected.defaultQuantity);
    else setQuantity(null);
  }, [selected]);

  const packOptions = useMemo(() => selected?.packOptions ?? [], [selected]);

  const onConfirm = async (): Promise<void> => {
    if (!selected || !patientId || !quantity) return;
    try {
      await assign.mutateAsync({
        medicationId: selected.id,
        quantity,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch {
      // error surface below
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="heading">Assign a medication</Text>
        <Text variant="body" tone="secondary">
          Search, pick the exact strength and form, then choose a fill quantity.
        </Text>
      </View>

      {selected ? (
        <Card raised>
          <Text variant="overline" tone="success">Selected</Text>
          <Text variant="title" style={styles.cardBody}>
            {selected.displayName}
          </Text>
          <Text variant="caption" tone="secondary">
            {selected.strength} · {DRUG_FORM_LABEL[selected.form]}
          </Text>
          <Button
            label="Change selection"
            variant="ghost"
            onPress={() => setSelected(null)}
            style={styles.changeBtn}
          />
        </Card>
      ) : (
        <>
          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name"
            onClear={() => setQuery('')}
            autoFocus
          />
          {debounced.trim().length < 2 ? (
            <EmptyState title="Start typing" description="Type at least two letters to find a medication." />
          ) : search.isLoading ? (
            <Spinner />
          ) : search.isError ? (
            <InlineBanner tone="warning" title="Search failed" description={describeError(search.error)} />
          ) : !search.data || search.data.length === 0 ? (
            <EmptyState title="No matches" description="Try a different spelling or a brand name." />
          ) : (
            <View style={styles.list}>
              {search.data.map((m) => (
                <ListItem
                  key={m.id}
                  title={m.displayName}
                  subtitle={`${m.strength} · ${DRUG_FORM_LABEL[m.form]}`}
                  right={<Badge label={m.strength} tone="info" />}
                  onPress={() => setSelected(m)}
                />
              ))}
            </View>
          )}
        </>
      )}

      {selected ? (
        <View style={styles.confirm}>
          <Card>
            <Text variant="overline" tone="secondary">Fill quantity</Text>
            <View style={styles.chipRow}>
              {packOptions.map((opt) => {
                const active = opt.quantity === quantity;
                return (
                  <Pressable
                    key={opt.quantity}
                    onPress={() => setQuantity(opt.quantity)}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text variant="bodyStrong" tone={active ? 'onPrimary' : 'primary'}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text variant="caption" tone="tertiary" style={styles.chipHint}>
              Defaults to {selected.defaultQuantity} {selected.quantityUnit}. The patient sees this
              fill size on their home screen.
            </Text>
          </Card>

          <SectionHeader label="Notes (optional)" />
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. take with food"
            multiline
            numberOfLines={3}
            maxLength={500}
          />
          {assign.isError ? (
            <InlineBanner tone="danger" title="Could not assign" description={describeError(assign.error)} />
          ) : null}
          <Button
            label={assign.isPending ? 'Assigning…' : 'Assign medication'}
            onPress={onConfirm}
            loading={assign.isPending}
            disabled={!quantity}
            fullWidth
            size="lg"
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.sm },
  cardBody: { marginTop: spacing.xs },
  changeBtn: { alignSelf: 'flex-start', marginTop: spacing.sm, paddingHorizontal: 0 },
  list: { gap: spacing.sm },
  confirm: { gap: spacing.md, marginTop: spacing.md },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.surface,
  },
  chipActive: { backgroundColor: palette.primary500, borderColor: palette.primary500 },
  chipHint: { marginTop: spacing.sm },
});
