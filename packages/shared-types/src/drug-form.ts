export const DrugForms = {
  TABLET: 'TABLET',
  CAPSULE: 'CAPSULE',
  SOLUTION: 'SOLUTION',
  SUSPENSION: 'SUSPENSION',
  INJECTION: 'INJECTION',
  CREAM: 'CREAM',
  OTHER: 'OTHER',
} as const;

export type DrugForm = (typeof DrugForms)[keyof typeof DrugForms];

export const DRUG_FORM_LABEL: Record<DrugForm, string> = {
  TABLET: 'Tablet',
  CAPSULE: 'Capsule',
  SOLUTION: 'Solution',
  SUSPENSION: 'Suspension',
  INJECTION: 'Injection',
  CREAM: 'Cream',
  OTHER: 'Other',
};

/**
 * Unit of measure that a prescription fill's quantity is expressed in,
 * keyed by the drug's dosage form. Matches how consumer pricing apps
 * surface pack size — tablets by count, oral liquids by mL, creams by g,
 * injections by doses, etc.
 */
export const PACK_UNIT_BY_FORM: Record<DrugForm, string> = {
  TABLET: 'tablets',
  CAPSULE: 'capsules',
  SOLUTION: 'mL',
  SUSPENSION: 'mL',
  INJECTION: 'doses',
  CREAM: 'g',
  OTHER: 'units',
};

export interface PackOption {
  quantity: number;
  unit: string;
  label: string; // e.g. "30 tablets" — what we show on chips
}

/**
 * Common prescription fill quantities per form. Ordering is load-bearing:
 * the first option is the default when nothing else is stored on the
 * patient medication. 30 tablets / 120 mL / 1 dose / 30 g all map to the
 * most common initial fill in US retail.
 */
export const DEFAULT_PACK_SIZES_BY_FORM: Record<DrugForm, readonly number[]> = {
  TABLET: [30, 60, 90],
  CAPSULE: [30, 60, 90],
  SOLUTION: [120, 240, 473],
  SUSPENSION: [120, 240],
  INJECTION: [1, 5],
  CREAM: [30, 60],
  OTHER: [1, 30],
};

export function getPackOptionsForForm(form: DrugForm): PackOption[] {
  const unit = PACK_UNIT_BY_FORM[form];
  return DEFAULT_PACK_SIZES_BY_FORM[form].map((quantity) => ({
    quantity,
    unit,
    label: `${quantity} ${unit}`,
  }));
}

export function packLabel(quantity: number, unit: string): string {
  // Handle obvious singular/plural on the common units.
  if (quantity === 1) {
    if (unit === 'tablets') return '1 tablet';
    if (unit === 'capsules') return '1 capsule';
    if (unit === 'doses') return '1 dose';
    if (unit === 'units') return '1 unit';
  }
  return `${quantity} ${unit}`;
}
