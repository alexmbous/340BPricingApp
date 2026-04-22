import { z } from 'zod';

import type { MedicationDto } from './medication';
import type { PharmacyDto } from './pharmacy';

export interface PatientDto {
  id: string;
  userId: string;
  organizationId: string;
  organizationName?: string; // present on /v1/me/patient-profile for UX copy
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date
  email: string;
  preferredPharmacyId: string | null;
  preferredPharmacy: PharmacyDto | null;
  eligibility340BAsserted: boolean;
  eligibilityAssertedAt: string | null;
  createdAt: string;
}

export interface PatientMedicationDto {
  id: string;
  medication: MedicationDto;
  /** Prescription fill quantity the clinic set (e.g. 30). */
  quantity: number;
  /** Unit label matching the drug's form (e.g. "tablets", "mL"). */
  quantityUnit: string;
  notes: string | null;
  assignedAt: string;
  assignedBy: { id: string; displayName: string };
}

/**
 * Patient medication augmented with the best pricing quote we can
 * produce at the patient's clinic-assigned preferred pharmacy. Returned
 * by GET /v1/me/medications so the home screen can render prices
 * without requesting location. If the patient has no preferred pharmacy,
 * bestPriceAtPreferredPharmacy is null and the UI nudges them to compare
 * nearby instead.
 */
export interface PatientMedicationWithPriceDto extends PatientMedicationDto {
  preferredPharmacy: PharmacyDto | null;
  bestPriceAtPreferredPharmacy: {
    amountCents: number;
    unitPriceCents: number;
    quantity: number;
    unit: string;
    currency: string;
    priceType: string; // PriceType literal; stringified to avoid an enum import cycle
    is340BEligibleDisplay: boolean;
    fetchedAt: string;
  } | null;
}

export const CreatePatientRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(200),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  preferredPharmacyId: z.string().cuid().optional(),
});
export type CreatePatientRequest = z.infer<typeof CreatePatientRequestSchema>;

export const UpdatePatientRequestSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  preferredPharmacyId: z.string().cuid().nullable().optional(),
  eligibility340BAsserted: z.boolean().optional(),
});
export type UpdatePatientRequest = z.infer<typeof UpdatePatientRequestSchema>;

export const AssignMedicationRequestSchema = z.object({
  medicationId: z.string().cuid(),
  /**
   * Fill quantity for this prescription. Optional on the request; the
   * server falls back to the drug's form-based default (e.g. 30 tablets).
   */
  quantity: z.number().int().min(1).max(10000).optional(),
  notes: z.string().max(500).optional(),
});
export type AssignMedicationRequest = z.infer<typeof AssignMedicationRequestSchema>;
