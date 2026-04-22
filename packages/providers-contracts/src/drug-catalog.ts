import type { DrugForm } from '@apexcare/shared-types';

/**
 * Canonical drug catalog provider.
 * v1 impl: MockDrugCatalogProvider (seeded RxNorm subset)
 * Future: RxNavDrugCatalogProvider (NLM public API), proprietary feeds.
 *
 * All returned records use RxNorm CUI (rxcui) as the stable identifier.
 */
export interface DrugCatalogHit {
  rxcui: string;
  name: string; // ingredient name e.g. "Atorvastatin"
  strength: string; // e.g. "20 mg"
  form: DrugForm;
  displayName: string; // e.g. "Atorvastatin 20 mg tablet"
}

export interface DrugDetail extends DrugHit {
  ndcCodes: string[];
  synonyms?: string[];
}

export interface DrugSearchInput {
  name: string;
  strength?: string;
  form?: DrugForm;
  limit?: number;
}

// alias to avoid name churn if we rename later
export type DrugHit = DrugCatalogHit;

export interface DrugCatalogProvider {
  /** Search by ingredient name + optional strength/form. */
  search(input: DrugSearchInput): Promise<DrugCatalogHit[]>;

  /** Look up a single drug by RxNorm concept id. Returns null if not found. */
  getByRxcui(rxcui: string): Promise<DrugDetail | null>;
}
