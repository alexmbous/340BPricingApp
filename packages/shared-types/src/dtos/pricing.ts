import { z } from 'zod';

import type { PriceType } from '../price-type';

import type { PharmacyDto } from './pharmacy';

export interface PricingQuoteDto {
  pharmacy: PharmacyDto;
  priceType: PriceType;
  /** Total price for `quantity` units. This is the headline number users compare. */
  amountCents: number;
  /** Per-unit price derived from amountCents / quantity, rounded to the nearest cent. */
  unitPriceCents: number;
  /** Fill quantity the quote is for (e.g. 30 tablets). */
  quantity: number;
  /** Unit label (e.g. "tablets", "mL", "doses"). */
  unit: string;
  currency: string;
  sourceProvider: string;
  fetchedAt: string;
  expiresAt: string | null;
  is340BEligibleDisplay: boolean;
  eligibilityReason?: string;
}

export const PricingCompareRequestSchema = z.object({
  rxcui: z.string().min(1).max(20),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusMiles: z.number().min(0.5).max(50).default(10),
  }),
  patientId: z.string().cuid().optional(),
  /**
   * Fill quantity to quote (e.g. 30 tablets, 120 mL). When omitted, the
   * server falls back to the medication's default quantity for its form.
   */
  quantity: z.number().int().min(1).max(10000).optional(),
  limit: z.number().int().min(1).max(25).default(10),
});
export type PricingCompareRequest = z.infer<typeof PricingCompareRequestSchema>;

export interface PricingCompareResponse {
  quotes: PricingQuoteDto[]; // sorted ascending by amountCents
  fetchedAt: string;
  /** The quantity used for these quotes — echoed so the UI can label results. */
  quantity: number;
  unit: string;
  /**
   * The patient's clinic-assigned preferred pharmacy id, if any. Included
   * so the UI can highlight it when it appears in the results. Not used
   * to reorder — lowest price is always the primary sort.
   */
  preferredPharmacyId: string | null;
  /**
   * Whether the preferred pharmacy was within the requested radius. When
   * false and preferredPharmacyId is set, the UI should surface a footer
   * hint that the preferred pharmacy isn't nearby.
   */
  preferredPharmacyInResults: boolean;
}
