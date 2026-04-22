import { DrugForms, type DrugForm } from '@apexcare/shared-types';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';


import {
  Card,
  EmptyState,
  InlineBanner,
  LocationPicker,
  PriceCard,
  Screen,
  SectionHeader,
  Spinner,
  Text,
  palette,
  radius,
  spacing,
  type LocationChoice,
} from '../../../src/design-system';
import { useMyPatientProfile } from '../../../src/features/auth/hooks';
import { usePricingCompare } from '../../../src/features/pricing/hooks';
import { describeError } from '../../../src/lib/errors';
import {
  defaultQuantity,
  formatPack,
  packOptions,
  unitFor,
} from '../../../src/lib/pack-options';

export default function CompareScreen(): React.ReactElement {
  const params = useLocalSearchParams<{
    rxcui?: string;
    displayName?: string;
    form?: string;
  }>();
  const rxcui = params.rxcui;
  const displayName = params.displayName;
  const form: DrugForm = useMemo(() => {
    const raw = params.form;
    if (raw && (Object.values(DrugForms) as string[]).includes(raw)) {
      return raw as DrugForm;
    }
    return DrugForms.TABLET; // safe fallback
  }, [params.form]);

  const options = useMemo(() => packOptions(form), [form]);
  const [quantity, setQuantity] = useState<number>(() => defaultQuantity(form));
  const unit = unitFor(form);

  const [choice, setChoice] = useState<LocationChoice | null>(null);
  const profile = useMyPatientProfile();

  const pricing = usePricingCompare(
    rxcui && choice
      ? {
          rxcui,
          location: {
            lat: choice.coords.lat,
            lng: choice.coords.lng,
            radiusMiles: 10,
          },
          quantity,
          limit: 10,
        }
      : null,
  );

  if (!rxcui) {
    return (
      <Screen>
        <InlineBanner tone="warning" title="Missing medication" description="Please pick a medication from Search." />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        {displayName ? <Text variant="heading">{displayName}</Text> : null}
        <Text variant="caption" tone="tertiary">Sorted by lowest price first</Text>
      </View>

      <Card>
        <Text variant="overline" tone="secondary">Quantity</Text>
        <View style={styles.chipRow}>
          {options.map((opt) => {
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
          Pick the fill size your prescription calls for. Larger packs often cost less per {unit.replace(/s$/, '')}.
        </Text>
      </Card>

      <LocationPicker value={choice} onChange={setChoice} initiallyExpanded={!choice} />

      {!choice ? (
        <EmptyState
          title="Where should we look?"
          description="Use your location, enter a ZIP code, or pick the demo location to see prices nearby."
        />
      ) : pricing.isLoading ? (
        <Spinner label="Comparing prices…" />
      ) : pricing.isError ? (
        <InlineBanner
          tone="danger"
          title="Couldn’t load prices"
          description={describeError(pricing.error)}
        />
      ) : pricing.data ? (
        <CompareResults
          data={pricing.data}
          preferredPharmacyName={profile.data?.preferredPharmacy?.name ?? null}
        />
      ) : null}
    </Screen>
  );
}

interface CompareResultsProps {
  data: NonNullable<ReturnType<typeof usePricingCompare>['data']>;
  preferredPharmacyName: string | null;
}

function CompareResults({ data, preferredPharmacyName }: CompareResultsProps): React.ReactElement {
  if (data.quotes.length === 0) {
    return (
      <EmptyState
        title="No prices nearby"
        description="No pharmacies with pricing within 10 miles. Try a different ZIP."
      />
    );
  }
  const bestPrice = data.quotes[0]!.amountCents;
  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader
        label={`${data.quotes.length} ${data.quotes.length === 1 ? 'result' : 'results'} for ${formatPack(data.quantity, data.unit)}`}
      />
      {data.quotes.map((q, idx) => (
        <PriceCard
          key={`${q.pharmacy.id}-${q.priceType}`}
          quote={q}
          isPreferred={data.preferredPharmacyId === q.pharmacy.id}
          isBestPrice={idx === 0 && q.amountCents === bestPrice}
        />
      ))}
      {data.preferredPharmacyId && !data.preferredPharmacyInResults ? (
        <InlineBanner
          tone="info"
          title="Your clinic’s preferred pharmacy isn’t nearby"
          description={
            preferredPharmacyName
              ? `${preferredPharmacyName} wasn’t within the search radius.`
              : 'It wasn’t within the search radius.'
          }
        />
      ) : null}
      <Text variant="caption" tone="tertiary" style={styles.disclaimer}>
        Prices are estimates and may change at the counter. 340B pricing only shows when your
        clinic has confirmed both your eligibility and the pharmacy’s contract arrangement.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xxs, marginTop: spacing.sm, marginBottom: spacing.sm },
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
  disclaimer: { marginTop: spacing.md },
});
