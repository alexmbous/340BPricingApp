import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { PharmacyDirectoryProvider } from '@apexcare/providers-contracts';
import type { PharmacyDto } from '@apexcare/shared-types';

import { PrismaService } from '../../prisma/prisma.service';
import { PHARMACY_DIRECTORY_PROVIDER } from '../../providers/pharmacy-directory/pharmacy-directory.tokens';

@Injectable()
export class PharmaciesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PHARMACY_DIRECTORY_PROVIDER)
    private readonly directory: PharmacyDirectoryProvider,
  ) {}

  async nearby(lat: number, lng: number, radiusMiles: number, limit: number): Promise<PharmacyDto[]> {
    const refs = await this.directory.findNearby({ lat, lng }, radiusMiles, limit);
    // Ensure each directory result is mirrored in our own Pharmacy table so
    // downstream flows (preferredPharmacyId, eligibility, pricing) can FK
    // against it safely.
    for (const r of refs) {
      await this.prisma.pharmacy.upsert({
        where: r.externalId ? { externalId: r.externalId } : { id: r.id },
        create: {
          id: r.id,
          externalId: r.externalId,
          name: r.name,
          address1: r.address1,
          city: r.city,
          state: r.state,
          postalCode: r.postalCode,
          lat: r.lat,
          lng: r.lng,
          phone: r.phone,
        },
        update: {
          name: r.name,
          address1: r.address1,
          city: r.city,
          state: r.state,
          postalCode: r.postalCode,
          lat: r.lat,
          lng: r.lng,
          phone: r.phone,
        },
      });
    }
    return refs.map((r) => ({
      id: r.id,
      name: r.name,
      address1: r.address1,
      city: r.city,
      state: r.state,
      postalCode: r.postalCode,
      lat: r.lat,
      lng: r.lng,
      phone: r.phone ?? null,
      distanceMiles: r.distanceMiles,
    }));
  }

  async getById(id: string): Promise<PharmacyDto> {
    const p = await this.prisma.pharmacy.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Pharmacy not found');
    return {
      id: p.id,
      name: p.name,
      address1: p.address1,
      city: p.city,
      state: p.state,
      postalCode: p.postalCode,
      lat: p.lat,
      lng: p.lng,
      phone: p.phone,
    };
  }
}
