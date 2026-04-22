import type { PriceType } from '@apexcare/shared-types';

export interface EligibilityInput {
  patientId: string;
  rxcui: string;
  pharmacyId: string;
}

export interface EligibilityDecision {
  eligible: boolean;
  programType: PriceType | null; // e.g. CONTRACT_340B when applicable
  reason: string; // human-readable, safe for display
}

/**
 * Decides whether a given patient is eligible for a pricing program at a
 * given pharmacy for a given drug. In v1 the only implementation defers to
 * the doctor office's stored eligibility assertion plus the org's contract
 * pharmacy network. Future implementations could integrate with a TPA.
 */
export interface EligibilityProvider {
  isEligible(input: EligibilityInput): Promise<EligibilityDecision>;
}
