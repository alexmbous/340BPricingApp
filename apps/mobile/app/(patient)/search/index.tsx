import { DRUG_FORM_LABEL, type MedicationDto } from '@apexcare/shared-types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';


import {
  Badge,
  EmptyState,
  InlineBanner,
  ListItem,
  Screen,
  SearchInput,
  SectionHeader,
  Spinner,
  Text,
  spacing,
} from '../../../src/design-system';
import { useMedicationSearch } from '../../../src/features/medication-search/hooks';
import { useDebounced } from '../../../src/lib/debounce';
import { describeError } from '../../../src/lib/errors';

export default function MedicationSearchScreen(): React.ReactElement {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 300);
  const search = useMedicationSearch(debounced);

  const onSelect = (m: MedicationDto): void => {
    router.push({
      pathname: '/(patient)/search/compare',
      params: {
        rxcui: m.rxcui,
        displayName: m.displayName,
        form: m.form,
      },
    });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="overline" tone="secondary">Find your medication</Text>
        <Text variant="heading">What are you looking for?</Text>
      </View>

      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name — e.g. atorvastatin"
        onClear={() => setQuery('')}
        autoFocus
      />

      {debounced.trim().length < 2 ? (
        <View style={styles.empty}>
          <EmptyState
            title="Start typing"
            description="Type at least two letters of a medication name. Pick a specific strength and form on the next step."
          />
        </View>
      ) : search.isLoading ? (
        <Spinner label="Searching…" />
      ) : search.isError ? (
        <InlineBanner tone="warning" title="Search failed" description={describeError(search.error)} />
      ) : !search.data || search.data.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            title="No matches"
            description="Try a different spelling or a brand name."
          />
        </View>
      ) : (
        <>
          <SectionHeader label={`${search.data.length} result${search.data.length === 1 ? '' : 's'}`} />
          <View style={styles.list}>
            {search.data.map((m) => (
              <ListItem
                key={m.id}
                title={m.displayName}
                subtitle={`${m.strength} · ${DRUG_FORM_LABEL[m.form]}`}
                right={<Badge label={m.strength} tone="info" />}
                onPress={() => onSelect(m)}
              />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.md, marginBottom: spacing.sm, gap: spacing.xs },
  empty: { marginTop: spacing.lg },
  list: { gap: spacing.sm },
});
