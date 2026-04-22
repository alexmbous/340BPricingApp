import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  EmptyState,
  InlineBanner,
  ListItem,
  Screen,
  SearchInput,
  SectionHeader,
  Spinner,
  Text,
  palette,
  spacing,
} from '../../../src/design-system';
import { usePatientsList } from '../../../src/features/patients/hooks';
import { useDebounced } from '../../../src/lib/debounce';
import { describeError } from '../../../src/lib/errors';
import { useAuthStore } from '../../../src/state/auth';

export default function AdminPatientsListScreen(): React.ReactElement {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 300);

  const orgId = user?.organizationId ?? null;
  const list = usePatientsList(orgId, debounced);

  const count = list.data?.items.length ?? 0;
  const hint = useMemo(
    () =>
      !orgId
        ? 'Your account is not scoped to an organization. Ask a platform admin for help.'
        : null,
    [orgId],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="overline" tone="secondary">Patients</Text>
        <Text variant="heading">Your roster</Text>
      </View>

      {hint ? <InlineBanner tone="warning" title="No clinic selected" description={hint} /> : null}

      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name or email"
        onClear={() => setQuery('')}
      />

      <Pressable
        onPress={() => router.push('/(admin)/patients/new')}
        style={({ pressed }) => [styles.newRow, pressed && styles.pressed]}
      >
        <Feather name="user-plus" size={18} color={palette.primary500} />
        <Text variant="bodyStrong" tone="primary" style={styles.newLabel}>
          Add a new patient
        </Text>
      </Pressable>

      {list.isLoading ? (
        <Spinner />
      ) : list.isError ? (
        <InlineBanner tone="danger" title="Couldn’t load patients" description={describeError(list.error)} />
      ) : !list.data || list.data.items.length === 0 ? (
        <EmptyState
          title={debounced.trim() ? 'No matching patients' : 'No patients yet'}
          description={debounced.trim() ? 'Try a different name or email.' : 'Create your first patient to get started.'}
          actionLabel={debounced.trim() ? undefined : 'Add a patient'}
          onAction={debounced.trim() ? undefined : () => router.push('/(admin)/patients/new')}
        />
      ) : (
        <>
          <SectionHeader label={`${count} patient${count === 1 ? '' : 's'}`} />
          <View style={styles.list}>
            {list.data.items.map((p) => (
              <ListItem
                key={p.id}
                title={`${p.firstName} ${p.lastName}`}
                subtitle={`${p.email} · DOB ${p.dateOfBirth}`}
                onPress={() =>
                  router.push({
                    pathname: '/(admin)/patients/[id]',
                    params: { id: p.id },
                  })
                }
                right={
                  p.eligibility340BAsserted ? (
                    <Text variant="caption" tone="success">340B</Text>
                  ) : null
                }
              />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.sm },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  newLabel: { color: palette.primary500 },
  pressed: { opacity: 0.7 },
  list: { gap: spacing.sm },
});
