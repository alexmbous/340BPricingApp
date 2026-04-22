import {
  PRICE_TYPE_DISPLAY,
  packLabel,
  type PricingQuoteDto,
} from '@apexcare/shared-types';
import React from 'react';
import { StyleSheet, View } from 'react-native';


import { formatCurrencyCents, formatMiles } from '../../lib/format';
import { palette, radius, spacing } from '../tokens';

import { Badge } from './Badge';
import { PriceBadge } from './PriceBadge';
import { Text } from './Text';

export interface PriceCardProps {
  quote: PricingQuoteDto;
  /** This quote's pharmacy matches the patient's preferred pharmacy. */
  isPreferred: boolean;
  /** Visual emphasis for the lowest-price card. */
  isBestPrice: boolean;
}

export function PriceCard({ quote, isPreferred, isBestPrice }: PriceCardProps): React.ReactElement {
  const { pharmacy, priceType, amountCents, unitPriceCents, quantity, unit } = quote;
  const display = PRICE_TYPE_DISPLAY[priceType];
  const unitSingular = unit === 'tablets'
    ? 'tablet'
    : unit === 'capsules'
      ? 'capsule'
      : unit === 'doses'
        ? 'dose'
        : unit === 'units'
          ? 'unit'
          : unit; // mL / g stay as-is
  return (
    <View style={[styles.card, isBestPrice && styles.cardBest, isPreferred && styles.cardPreferred]}>
      <View style={styles.headerRow}>
        <View style={styles.badges}>
          <PriceBadge priceType={priceType} />
          {isPreferred ? <Badge label="Preferred by clinic" tone="success" /> : null}
          {isBestPrice ? <Badge label="Lowest price" tone="info" /> : null}
        </View>
        <View style={styles.priceCol}>
          <Text variant="heading" style={styles.price}>
            {formatCurrencyCents(amountCents, quote.currency)}
          </Text>
          <Text variant="caption" tone="tertiary" style={styles.priceSub}>
            {packLabel(quantity, unit)} · {formatCurrencyCents(unitPriceCents, quote.currency)}/{unitSingular}
          </Text>
        </View>
      </View>
      <Text variant="title" numberOfLines={1} style={styles.pharmacyName}>
        {pharmacy.name}
      </Text>
      <Text variant="caption" tone="secondary" numberOfLines={1}>
        {pharmacy.address1} · {pharmacy.city}, {pharmacy.state} {pharmacy.postalCode}
      </Text>
      <View style={styles.footerRow}>
        <Text variant="caption" tone="tertiary">
          {formatMiles(pharmacy.distanceMiles)}
        </Text>
        <Text variant="caption" tone="tertiary" numberOfLines={1} style={styles.priceTypeHint}>
          {display.description}
        </Text>
      </View>
      {quote.is340BEligibleDisplay && quote.eligibilityReason ? (
        <Text variant="caption" tone="success" style={styles.eligibility}>
          {quote.eligibilityReason}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardBest: {
    borderColor: palette.primary300,
    backgroundColor: palette.surface,
  },
  cardPreferred: {
    borderColor: palette.success500,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  priceCol: { alignItems: 'flex-end' },
  price: { fontVariant: ['tabular-nums'] },
  priceSub: { marginTop: 2, fontVariant: ['tabular-nums'] },
  pharmacyName: { marginTop: spacing.xxs },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  priceTypeHint: { flex: 1, textAlign: 'right' },
  eligibility: { marginTop: spacing.sm },
});
