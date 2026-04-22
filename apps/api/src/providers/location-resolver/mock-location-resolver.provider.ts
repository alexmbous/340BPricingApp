import type {
  LocationResolverProvider,
  ZipResolution,
} from '@apexcare/providers-contracts';
import { Injectable } from '@nestjs/common';


// Seeded ZIP centroids for the cities where MOCK_PHARMACY_SEED places
// pharmacies. Coordinates are approximate ZIP centroids rounded to 4
// decimal places. Fictional by design — swap for a real geocoder
// before any user-facing launch.
const SEED: readonly ZipResolution[] = [
  // ── Chicago, IL ─────────────────────────────────────────────
  { postalCode: '60607', city: 'Chicago', state: 'IL', lat: 41.8747, lng: -87.6505 },
  { postalCode: '60608', city: 'Chicago', state: 'IL', lat: 41.8502, lng: -87.6712 },
  { postalCode: '60610', city: 'Chicago', state: 'IL', lat: 41.9003, lng: -87.6373 },
  { postalCode: '60614', city: 'Chicago', state: 'IL', lat: 41.9237, lng: -87.6486 },
  { postalCode: '60615', city: 'Chicago', state: 'IL', lat: 41.8030, lng: -87.5998 },
  { postalCode: '60616', city: 'Chicago', state: 'IL', lat: 41.8455, lng: -87.6269 },
  { postalCode: '60618', city: 'Chicago', state: 'IL', lat: 41.9469, lng: -87.7027 },
  { postalCode: '60622', city: 'Chicago', state: 'IL', lat: 41.9012, lng: -87.6779 },
  { postalCode: '60657', city: 'Chicago', state: 'IL', lat: 41.9403, lng: -87.6540 },
  { postalCode: '60660', city: 'Chicago', state: 'IL', lat: 41.9908, lng: -87.6669 },

  // ── Austin, TX ──────────────────────────────────────────────
  { postalCode: '78701', city: 'Austin', state: 'TX', lat: 30.2711, lng: -97.7437 },
  { postalCode: '78702', city: 'Austin', state: 'TX', lat: 30.2625, lng: -97.7148 },
  { postalCode: '78704', city: 'Austin', state: 'TX', lat: 30.2416, lng: -97.7669 },
  { postalCode: '78723', city: 'Austin', state: 'TX', lat: 30.3022, lng: -97.6916 },
  { postalCode: '78745', city: 'Austin', state: 'TX', lat: 30.2169, lng: -97.7983 },
  { postalCode: '78751', city: 'Austin', state: 'TX', lat: 30.3093, lng: -97.7281 },

  // ── New York, NY ────────────────────────────────────────────
  { postalCode: '10002', city: 'New York', state: 'NY', lat: 40.7174, lng: -73.9864 },
  { postalCode: '10033', city: 'New York', state: 'NY', lat: 40.8498, lng: -73.9366 },
  { postalCode: '10035', city: 'New York', state: 'NY', lat: 40.7974, lng: -73.9394 },
  { postalCode: '11201', city: 'Brooklyn', state: 'NY', lat: 40.6943, lng: -73.9903 },
  { postalCode: '11355', city: 'Flushing', state: 'NY', lat: 40.7547, lng: -73.8300 },
];

@Injectable()
export class MockLocationResolverProvider implements LocationResolverProvider {
  async resolveZip(zip: string): Promise<ZipResolution | null> {
    const fiveDigit = zip.trim().slice(0, 5);
    return SEED.find((r) => r.postalCode === fiveDigit) ?? null;
  }
}

export { SEED as MOCK_ZIP_SEED };
