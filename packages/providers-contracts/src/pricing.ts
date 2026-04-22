import type { PriceType } from '@apexcare/shared-types';

export interface EligibilityHint {
  programType: PriceType; // e.g. CONTRACT_340B
  organizationId: string;
}

export interface PricingQuoteResult {
  pharmacyId: string;
  priceType: PriceType;
  /** Total price for `quantity` units, in cents. */
  amountCents: number;
  /** Per-unit price in cents, rounded to the nearest cent. */
  unitPriceCents: number;
  /** Fill quantity this quote is for. Echoed back so callers can label UI. */
  quantity: number;
  unit: string;
  currency: 'USD';
  sourceProvider: string; // vendor id / mock id
  fetchedAt: Date;
  expiresAt?: Date;
}

export interface PricingGetQuotesInput {
  rxcui: string;
  ndc?: string;
  pharmacyIds: string[];
  /** Fill quantity to quote. */
  quantity: number;
  /** Unit of measure that `quantity` is expressed in (tablets, mL, etc.). */
  unit: string;
  patientContext: {
    organizationId: string | null;
    eligibilityHints: EligibilityHint[];
  };
}

/**
 * Returns pricing quotes for a drug at a set of pharmacies.
 *
 * Note: this interface MAY return CONTRACT_340B quotes for pharmacies that are
 * not in the caller's contract network — the caller (pricing service) is
 * responsible for filtering/validating via PharmacyNetworkEligibility.
 * Keeping that guardrail inside our domain, not at the provider boundary, lets
 * us swap providers without trusting them for compliance-sensitive labeling.
 */
export interface PricingProvider {
  getQuotes(input: PricingGetQuotesInput): Promise<PricingQuoteResult[]>;
}
