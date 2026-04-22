
import type {
  DrugCatalogHit,
  DrugCatalogProvider,
  DrugDetail,
  DrugSearchInput,
} from '@apexcare/providers-contracts';
import { DrugForms, type DrugForm } from '@apexcare/shared-types';
import { Injectable } from '@nestjs/common';

// A small, deterministic subset of common outpatient drugs. Real RxCUIs
// from RxNorm (https://mor.nlm.nih.gov/RxNav/) — used so future migration
// to a live RxNav provider doesn't invalidate existing records.
interface SeedRow {
  rxcui: string;
  name: string;
  strength: string;
  form: DrugForm;
  ndcCodes: string[];
}

const SEED: SeedRow[] = [
  { rxcui: '617312', name: 'Atorvastatin', strength: '10 mg', form: DrugForms.TABLET, ndcCodes: ['00378-2074-01'] },
  { rxcui: '617314', name: 'Atorvastatin', strength: '20 mg', form: DrugForms.TABLET, ndcCodes: ['00378-2076-01'] },
  { rxcui: '617318', name: 'Atorvastatin', strength: '40 mg', form: DrugForms.TABLET, ndcCodes: ['00378-2078-01'] },
  { rxcui: '197381', name: 'Lisinopril', strength: '10 mg', form: DrugForms.TABLET, ndcCodes: ['00093-1115-01'] },
  { rxcui: '197379', name: 'Lisinopril', strength: '20 mg', form: DrugForms.TABLET, ndcCodes: ['00093-1116-01'] },
  { rxcui: '860975', name: 'Metformin HCl', strength: '500 mg', form: DrugForms.TABLET, ndcCodes: ['00378-0415-01'] },
  { rxcui: '860999', name: 'Metformin HCl', strength: '1000 mg', form: DrugForms.TABLET, ndcCodes: ['00378-0419-01'] },
  { rxcui: '314231', name: 'Amlodipine', strength: '5 mg', form: DrugForms.TABLET, ndcCodes: ['00781-5057-10'] },
  { rxcui: '314232', name: 'Amlodipine', strength: '10 mg', form: DrugForms.TABLET, ndcCodes: ['00781-5058-10'] },
  { rxcui: '313850', name: 'Omeprazole', strength: '20 mg', form: DrugForms.CAPSULE, ndcCodes: ['00378-1809-01'] },
  { rxcui: '197806', name: 'Losartan', strength: '50 mg', form: DrugForms.TABLET, ndcCodes: ['00378-3681-01'] },
  { rxcui: '197807', name: 'Losartan', strength: '100 mg', form: DrugForms.TABLET, ndcCodes: ['00378-3682-01'] },
  { rxcui: '197591', name: 'Hydrochlorothiazide', strength: '25 mg', form: DrugForms.TABLET, ndcCodes: ['00378-0151-01'] },
  { rxcui: '849574', name: 'Sertraline', strength: '50 mg', form: DrugForms.TABLET, ndcCodes: ['00093-7199-01'] },
  { rxcui: '849575', name: 'Sertraline', strength: '100 mg', form: DrugForms.TABLET, ndcCodes: ['00093-7200-01'] },
  { rxcui: '212033', name: 'Levothyroxine', strength: '50 mcg', form: DrugForms.TABLET, ndcCodes: ['00074-6594-90'] },
  { rxcui: '966222', name: 'Albuterol sulfate', strength: '90 mcg/actuation', form: DrugForms.SOLUTION, ndcCodes: ['00173-0682-20'] },
  { rxcui: '1000097', name: 'Amoxicillin', strength: '500 mg', form: DrugForms.CAPSULE, ndcCodes: ['00093-4155-01'] },
  { rxcui: '311354', name: 'Prednisone', strength: '10 mg', form: DrugForms.TABLET, ndcCodes: ['00054-4742-25'] },
  { rxcui: '197319', name: 'Gabapentin', strength: '300 mg', form: DrugForms.CAPSULE, ndcCodes: ['00093-0073-01'] },
];

@Injectable()
export class MockDrugCatalogProvider implements DrugCatalogProvider {
  async search(input: DrugSearchInput): Promise<DrugCatalogHit[]> {
    const needle = input.name.trim().toLowerCase();
    const hits = SEED.filter((s) => s.name.toLowerCase().includes(needle));
    const filtered = hits
      .filter((s) => !input.strength || normalize(s.strength) === normalize(input.strength))
      .filter((s) => !input.form || s.form === input.form)
      .slice(0, input.limit ?? 20);
    return filtered.map(toHit);
  }

  async getByRxcui(rxcui: string): Promise<DrugDetail | null> {
    const row = SEED.find((s) => s.rxcui === rxcui);
    if (!row) return null;
    return { ...toHit(row), ndcCodes: row.ndcCodes };
  }
}

function toHit(r: SeedRow): DrugCatalogHit {
  return {
    rxcui: r.rxcui,
    name: r.name,
    strength: r.strength,
    form: r.form,
    displayName: `${r.name} ${r.strength} ${labelForForm(r.form)}`,
  };
}

function labelForForm(f: DrugForm): string {
  const map: Record<DrugForm, string> = {
    TABLET: 'tablet',
    CAPSULE: 'capsule',
    SOLUTION: 'solution',
    SUSPENSION: 'suspension',
    INJECTION: 'injection',
    CREAM: 'cream',
    OTHER: '',
  };
  return map[f];
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

export { SEED as MOCK_DRUG_SEED };
