import {
  DEFAULT_PACK_SIZES_BY_FORM,
  PACK_UNIT_BY_FORM,
  getPackOptionsForForm,
  packLabel,
  type DrugForm,
  type PackOption,
} from '@apexcare/shared-types';

/**
 * Mobile-side helpers that wrap the shared pack-option constants. Kept
 * thin on purpose — backend and mobile use the same defaults so the
 * UI and API never disagree on what "30 tablets" means.
 */
export function packOptions(form: DrugForm): PackOption[] {
  return getPackOptionsForForm(form);
}

export function defaultQuantity(form: DrugForm): number {
  return DEFAULT_PACK_SIZES_BY_FORM[form][0] ?? 1;
}

export function unitFor(form: DrugForm): string {
  return PACK_UNIT_BY_FORM[form];
}

export function formatPack(quantity: number, unit: string): string {
  return packLabel(quantity, unit);
}
