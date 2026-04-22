import type { PatientMedicationWithPriceDto } from '@apexcare/shared-types';
import {
  PRICE_TYPE_DISPLAY,
  packLabel,
  type PriceType,
} from '@apexcare/shared-types';
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
  palette,
  spacing,
} from '../../src/design-system';
import {
  useMyMedicationsWithPrices,
  useMyPatientProfile,
} from '../../src/features/auth/hooks';
import { formatCurrencyCents } from '../../src/lib/format';
import { useAuthStore } from '../../src/state/auth';

export default function PatientHomeScreen(): React.ReactElement {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useMyPatientProfile();
  const meds = useMyMedicationsWithPrices();

  const firstName = user?.displayName?.split(' ')[0] ?? 'there';
  const hasPreferredPharmacy = !!profile.data?.preferredPharmacy;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text variant="overline" tone="secondary">Welcome</Text>
        <Text variant="display">Hi {firstName}</Text>
        {profile.data?.organizationName ? (
          <Text variant="body" tone="secondary">
            Care from {profile.data.organizationName}
          </Text>
        ) : null}
      </View>

      {profile.data?.preferredPharmacy ? (
        <Card raised>
          <Text variant="overline" tone="success">Preferred by your clinic</Text>
          <Text variant="title" style={styles.pharmaName}>
            {profile.data.preferredPharmacy.name}
          </Text>
          <Text variant="caption" tone="secondary">
            {profile.data.preferredPharmacy.address1} · {profile.data.preferredPharmacy.city},{' '}
            {profile.data.preferredPharmacy.state}
          </Text>
        </Card>
      ) : profile.isLoading ? (
        <Spinner label="Loading your profile…" />
      ) : null}

      <Card>
        <Text variant="title">Compare prices near you</Text>
        <Text variant="body" tone="secondary" style={styles.cardBody}>
          Search for a medication and we’ll show the lowest prices at pharmacies near you — or at
          any ZIP you pick.
        </Text>
        <Button
          label="Search medications"
          onPress={() => router.navigate('/(patient)/search')}
          style={styles.cta}
          fullWidth
        />
      </Card>

      <SectionHeader label="Your medications" />
      {!hasPreferredPharmacy && meds.data && meds.data.length > 0 ? (
        <InlineBanner
          tone="info"
          title="No preferred pharmacy set"
          description="Your clinic hasn’t picked a pharmacy yet, so we can’t show a price here. Use Search to compare nearby."
        />
      ) : null}

      {meds.isLoading ? (
        <Spinner />
      ) : meds.isError ? (
        <InlineBanner
          tone="warning"
          title="Couldn’t load your medications"
          description="Try again in a moment."
        />
      ) : !meds.data || meds.data.length === 0 ? (
        <Card>
          <Text variant="body" tone="secondary">
            Your clinic hasn’t added any medications yet. Ask them on your next visit.
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {meds.data.map((m) => (
            <MedicationRow key={m.id} item={m} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function MedicationRow({ item }: { item: PatientMedicationWithPriceDto }): React.ReactElement {
  const price = item.bestPriceAtPreferredPharmacy;
  const priceType = price?.priceType as PriceType | undefined;
  const packText = packLabel(item.quantity, item.quantityUnit);
  return (
    <Card>
      <View style={styles.rowTop}>
        <View style={styles.rowBody}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {item.medication.displayName}
          </Text>
          <Text variant="caption" tone="secondary" style={styles.packLine}>
            {packText}
          </Text>
          <Text variant="caption" tone="tertiary" style={styles.rowSub}>
            Assigned by {item.assignedBy.displayName}
          </Text>
        </View>
        <View style={styles.priceCol}>
          {price ? (
            <>
              <Text variant="title" style={styles.priceValue}>
                {formatCurrencyCents(price.amountCents, price.currency)}
              </Text>
              <Text variant="caption" tone="tertiary" style={styles.priceSub}>
                for {packText}
              </Text>
              <Text variant="caption" tone="tertiary" style={styles.priceSub}>
                {formatCurrencyCents(price.unitPriceCents, price.currency)}/
                {unitSingular(price.unit)}
              </Text>
            </>
          ) : (
            <Text variant="bodyStrong" tone="tertiary">—</Text>
          )}
        </View>
      </View>
      {priceType ? (
        <View style={styles.badgeRow}>
          <Badge
            label={PRICE_TYPE_DISPLAY[priceType].shortLabel}
            tone={priceType === 'CONTRACT_340B' ? 'success' : priceType === 'DISCOUNT_CARD' ? 'info' : 'neutral'}
          />
          {price?.is340BEligibleDisplay ? (
            <Text variant="caption" tone="success" style={styles.eligibilityNote}>
              Eligible through your clinic
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function unitSingular(unit: string): string {
  if (unit === 'tablets') return 'tablet';
  if (unit === 'capsules') return 'capsule';
  if (unit === 'doses') return 'dose';
  if (unit === 'units') return 'unit';
  return unit;
}

const styles = StyleSheet.create({
  hero: { gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.sm },
  pharmaName: { marginTop: spacing.xs },
  cardBody: { marginTop: spacing.xs },
  cta: { marginTop: spacing.md },
  list: { gap: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  rowBody: { flex: 1, minWidth: 0 },
  packLine: { marginTop: 2 },
  rowSub: { marginTop: 2 },
  priceCol: { alignItems: 'flex-end', minWidth: 96 },
  priceValue: { fontVariant: ['tabular-nums'], color: palette.textPrimary },
  priceSub: { marginTop: 2 },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  eligibilityNote: { flex: 1 },
});
