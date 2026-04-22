import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type {
  PricingGetQuotesInput,
  PricingProvider,
  PricingQuoteResult,
} from '@apexcare/providers-contracts';
import { PriceTypes, type PriceType } from '@apexcare/shared-types';

/**
 * Deterministic mock pricing: given (rxcui, pharmacyId), always returns
 * the same unit price. Quantity scales the total with a small
 * bulk-fill discount at 60+ and a deeper one at 90+ — shapes that
 * mirror what a real cash-discount network reveals.
 *
 * Emits:
 *  - a RETAIL_CASH quote for every pharmacy,
 *  - a DISCOUNT_CARD quote for ~70% of pharmacies,
 *  - a CONTRACT_340B quote for every pharmacy in the caller's eligibility
 *    hints (the pricing service decides whether to display it).
 */
@Injectable()
export class MockPricingProvider implements PricingProvider {
  async getQuotes(input: PricingGetQuotesInput): Promise<PricingQuoteResult[]> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60_000);
    const results: PricingQuoteResult[] = [];

    const contractedOrg = input.patientContext.eligibilityHints.find(
      (h) => h.programType === PriceTypes.CONTRACT_340B,
    );

    for (const pharmacyId of input.pharmacyIds) {
      // Per-unit retail cash price is stable for a (rxcui, pharmacy) pair.
      const retailUnit = unitPriceCents(input.rxcui, pharmacyId, 'retail');
      results.push(
        build(pharmacyId, PriceTypes.RETAIL_CASH, retailUnit, input.quantity, input.unit, now, expiresAt),
      );

      if (hashPct(input.rxcui, pharmacyId) < 70) {
        // Discount card ~55–75% of retail.
        const discountUnit = Math.max(
          25,
          Math.round(retailUnit * (0.55 + (hashPct(input.rxcui, pharmacyId, 'd') / 100) * 0.2)),
        );
        results.push(
          build(
            pharmacyId,
            PriceTypes.DISCOUNT_CARD,
            discountUnit,
            input.quantity,
            input.unit,
            now,
            expiresAt,
          ),
        );
      }

      if (contractedOrg) {
        // 340B ceiling is dramatically lower; simulate 15–25% of retail.
        const pct = 15 + (hashPct(input.rxcui, pharmacyId, '340b') % 11);
        const ceilingUnit = Math.max(5, Math.round(retailUnit * (pct / 100)));
        results.push(
          build(
            pharmacyId,
            PriceTypes.CONTRACT_340B,
            ceilingUnit,
            input.quantity,
            input.unit,
            now,
            expiresAt,
          ),
        );
      }
    }

    return results;
  }
}

/**
 * Scales unit price by quantity and applies a small bulk discount when the
 * fill is ≥60 or ≥90. Minimum total of $1.00 so demos don't produce
 * absurd sub-cent totals for 340B + small quantity combinations.
 */
function totalForQuantity(unitCents: number, quantity: number): number {
  const multiplier = quantity >= 90 ? 0.85 : quantity >= 60 ? 0.92 : 1.0;
  const total = Math.round(unitCents * quantity * multiplier);
  return Math.max(100, total);
}

function build(
  pharmacyId: string,
  priceType: PriceType,
  unitCents: number,
  quantity: number,
  unit: string,
  fetchedAt: Date,
  expiresAt: Date,
): PricingQuoteResult {
  const amountCents = totalForQuantity(unitCents, quantity);
  const realizedUnit = Math.round(amountCents / quantity);
  return {
    pharmacyId,
    priceType,
    amountCents,
    unitPriceCents: realizedUnit,
    quantity,
    unit,
    currency: 'USD',
    sourceProvider: 'mock/v1',
    fetchedAt,
    expiresAt,
  };
}

/**
 * Deterministic per-unit retail price in range [50, 450] cents
 * (US$0.50–$4.50 per tablet / per mL / per dose). Multiplied by quantity
 * to produce the total, then optionally discounted for bulk.
 */
function unitPriceCents(rxcui: string, pharmacyId: string, salt: string): number {
  const h = createHash('sha256').update(`${rxcui}|${pharmacyId}|${salt}`).digest();
  const n = h.readUInt32BE(0);
  return 50 + (n % 401);
}

function hashPct(rxcui: string, pharmacyId: string, salt = ''): number {
  const h = createHash('sha256').update(`${rxcui}|${pharmacyId}|${salt}`).digest();
  return h[0]! % 100;
}
