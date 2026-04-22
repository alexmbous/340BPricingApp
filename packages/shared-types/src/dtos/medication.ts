import { z } from 'zod';

import { DrugForms } from '../drug-form';
import type { DrugForm, PackOption } from '../drug-form';

export interface MedicationDto {
  id: string;
  rxcui: string;
  name: string;
  strength: string;
  form: DrugForm;
  displayName: string;
  /** Suggested pack sizes to offer for this drug's form. */
  packOptions: PackOption[];
  /** Default quantity + unit for a new prescription fill. */
  defaultQuantity: number;
  quantityUnit: string;
}

export const MedicationSearchQuerySchema = z.object({
  name: z.string().min(1).max(100),
  strength: z.string().max(50).optional(),
  form: z.nativeEnum(DrugForms).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
export type MedicationSearchQuery = z.infer<typeof MedicationSearchQuerySchema>;
