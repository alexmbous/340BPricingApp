import { PRICE_TYPE_DISPLAY, type PriceType } from '@apexcare/shared-types';
import React from 'react';


import { Badge, type BadgeTone } from './Badge';

const TONE_MAP: Record<PriceType, BadgeTone> = {
  RETAIL_CASH: 'neutral',
  DISCOUNT_CARD: 'info',
  CONTRACT_340B: 'success',
  INSURANCE_EST: 'warning',
};

export interface PriceBadgeProps {
  priceType: PriceType;
}

export function PriceBadge({ priceType }: PriceBadgeProps): React.ReactElement {
  const display = PRICE_TYPE_DISPLAY[priceType];
  return <Badge label={display.shortLabel} tone={TONE_MAP[priceType]} />;
}
