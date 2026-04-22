
import type {
  DrugCatalogProvider,
  DrugSearchInput,
} from '@apexcare/providers-contracts';
import type { MedicationDto } from '@apexcare/shared-types';
import {
  DEFAULT_PACK_SIZES_BY_FORM,
  PACK_UNIT_BY_FORM,
  getPackOptionsForForm,
} from '@apexcare/shared-types';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { DRUG_CATALOG_PROVIDER } from '../../providers/drug-catalog/drug-catalog.tokens';

@Injectable()
export class MedicationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DRUG_CATALOG_PROVIDER)
    private readonly drugCatalog: DrugCatalogProvider,
  ) {}

  /**
   * Combined catalog search:
   *  1. Delegate to DrugCatalogProvider (future: RxNav / vendor feed).
   *  2. Upsert each hit into our local Medication table so the rest of
   *     the system (PatientMedication, pricing) always references a real
   *     local record with a stable id.
   *
   * This keeps the mobile app shielded from the provider's ids.
   */
  async search(input: DrugSearchInput): Promise<MedicationDto[]> {
    const hits = await this.drugCatalog.search(input);
    if (hits.length === 0) return [];

    // Upsert by rxcui — cheap because list is tiny and table has unique index.
    const byRxcui = new Map<string, (typeof hits)[number]>();
    for (const h of hits) byRxcui.set(h.rxcui, h);

    const existing = await this.prisma.medication.findMany({
      where: { rxcui: { in: [...byRxcui.keys()] } },
    });
    const existingRxcuis = new Set(existing.map((m) => m.rxcui));

    const toCreate = [...byRxcui.values()].filter((h) => !existingRxcuis.has(h.rxcui));
    if (toCreate.length > 0) {
      await this.prisma.medication.createMany({
        data: toCreate.map((h) => ({
          rxcui: h.rxcui,
          name: h.name,
          strength: h.strength,
          form: h.form,
          displayName: h.displayName,
        })),
        skipDuplicates: true,
      });
    }

    const all = await this.prisma.medication.findMany({
      where: { rxcui: { in: [...byRxcui.keys()] } },
    });
    // Preserve provider order (often relevance-sorted)
    const byRxcuiOut = new Map(all.map((m) => [m.rxcui, m]));
    return hits
      .map((h) => byRxcuiOut.get(h.rxcui))
      .filter((m): m is NonNullable<typeof m> => !!m)
      .map(toDto);
  }

  async getById(id: string): Promise<MedicationDto> {
    const m = await this.prisma.medication.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Medication not found');
    return toDto(m);
  }
}

function toDto(m: {
  id: string;
  rxcui: string;
  name: string;
  strength: string;
  form: MedicationDto['form'];
  displayName: string;
}): MedicationDto {
  const unit = PACK_UNIT_BY_FORM[m.form];
  const defaultQuantity = DEFAULT_PACK_SIZES_BY_FORM[m.form][0] ?? 1;
  return {
    id: m.id,
    rxcui: m.rxcui,
    name: m.name,
    strength: m.strength,
    form: m.form,
    displayName: m.displayName,
    packOptions: getPackOptionsForForm(m.form),
    defaultQuantity,
    quantityUnit: unit,
  };
}
