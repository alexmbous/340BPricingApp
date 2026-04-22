
import type {
  LocationResolverProvider,
  ZipResolution,
} from '@apexcare/providers-contracts';
import type { ZipGeocodeResultDto } from '@apexcare/shared-types';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { LOCATION_RESOLVER_PROVIDER } from '../../providers/location-resolver/location-resolver.tokens';

@Injectable()
export class LocationsService {
  constructor(
    @Inject(LOCATION_RESOLVER_PROVIDER)
    private readonly resolver: LocationResolverProvider,
  ) {}

  async resolveZip(zip: string): Promise<ZipGeocodeResultDto> {
    const normalized = zip.trim();
    const hit = await this.resolver.resolveZip(normalized);
    if (!hit) {
      throw new NotFoundException({
        message: `No location found for ZIP ${normalized}`,
        code: 'ZIP_NOT_FOUND',
      });
    }
    return toDto(hit);
  }
}

function toDto(r: ZipResolution): ZipGeocodeResultDto {
  return {
    postalCode: r.postalCode,
    city: r.city,
    state: r.state,
    lat: r.lat,
    lng: r.lng,
  };
}
