import { Injectable } from '@nestjs/common';

import type {
  GeoPoint,
  PharmacyDirectoryProvider,
  PharmacyRef,
} from '@apexcare/providers-contracts';

interface SeedPharmacy {
  id: string;
  externalId: string;
  name: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  lat: number;
  lng: number;
  phone: string;
}

// Seeded around three US cities with realistic coordinates.
// These are FICTIONAL pharmacies — do not assume correspondence with
// any real pharmacy at these addresses.
const SEED: SeedPharmacy[] = [
  // Chicago cluster
  { id: 'pharm_chi_001', externalId: 'MOCK-CHI-001', name: 'Apex Community Rx — Lincoln Park', address1: '1200 N Clark St', city: 'Chicago', state: 'IL', postalCode: '60610', lat: 41.9036, lng: -87.6319, phone: '(312) 555-0101' },
  { id: 'pharm_chi_002', externalId: 'MOCK-CHI-002', name: 'Midwest Family Pharmacy', address1: '2310 W Belmont Ave', city: 'Chicago', state: 'IL', postalCode: '60618', lat: 41.9395, lng: -87.6853, phone: '(312) 555-0102' },
  { id: 'pharm_chi_003', externalId: 'MOCK-CHI-003', name: 'Lakeside Rx', address1: '3400 N Broadway', city: 'Chicago', state: 'IL', postalCode: '60657', lat: 41.9441, lng: -87.6443, phone: '(312) 555-0103' },
  { id: 'pharm_chi_004', externalId: 'MOCK-CHI-004', name: 'Bridgeport Pharmacy Co-op', address1: '3158 S Halsted St', city: 'Chicago', state: 'IL', postalCode: '60608', lat: 41.8384, lng: -87.6471, phone: '(312) 555-0104' },
  { id: 'pharm_chi_005', externalId: 'MOCK-CHI-005', name: 'Hyde Park Community Pharmacy', address1: '5230 S Harper Ct', city: 'Chicago', state: 'IL', postalCode: '60615', lat: 41.7988, lng: -87.5917, phone: '(312) 555-0105' },
  { id: 'pharm_chi_006', externalId: 'MOCK-CHI-006', name: 'North Shore Rx', address1: '1825 W Devon Ave', city: 'Chicago', state: 'IL', postalCode: '60660', lat: 41.9984, lng: -87.6748, phone: '(312) 555-0106' },
  { id: 'pharm_chi_007', externalId: 'MOCK-CHI-007', name: 'Wicker Park Rx', address1: '1525 N Milwaukee Ave', city: 'Chicago', state: 'IL', postalCode: '60622', lat: 41.9093, lng: -87.6776, phone: '(312) 555-0107' },
  { id: 'pharm_chi_008', externalId: 'MOCK-CHI-008', name: 'Chinatown Health Pharmacy', address1: '2133 S Wentworth Ave', city: 'Chicago', state: 'IL', postalCode: '60616', lat: 41.8533, lng: -87.6320, phone: '(312) 555-0108' },

  // Austin cluster
  { id: 'pharm_aus_001', externalId: 'MOCK-AUS-001', name: 'Hill Country Pharmacy', address1: '2909 S Lamar Blvd', city: 'Austin', state: 'TX', postalCode: '78704', lat: 30.2464, lng: -97.7896, phone: '(512) 555-0201' },
  { id: 'pharm_aus_002', externalId: 'MOCK-AUS-002', name: 'East Side Rx', address1: '2338 E Cesar Chavez St', city: 'Austin', state: 'TX', postalCode: '78702', lat: 30.2562, lng: -97.7167, phone: '(512) 555-0202' },
  { id: 'pharm_aus_003', externalId: 'MOCK-AUS-003', name: 'North Loop Community Pharmacy', address1: '5555 N Lamar Blvd', city: 'Austin', state: 'TX', postalCode: '78751', lat: 30.3177, lng: -97.7308, phone: '(512) 555-0203' },
  { id: 'pharm_aus_004', externalId: 'MOCK-AUS-004', name: 'Westgate Rx', address1: '4477 S Lamar Blvd', city: 'Austin', state: 'TX', postalCode: '78745', lat: 30.2251, lng: -97.7987, phone: '(512) 555-0204' },
  { id: 'pharm_aus_005', externalId: 'MOCK-AUS-005', name: 'Mueller District Pharmacy', address1: '1800 Simond Ave', city: 'Austin', state: 'TX', postalCode: '78723', lat: 30.2989, lng: -97.7053, phone: '(512) 555-0205' },

  // NYC cluster
  { id: 'pharm_nyc_001', externalId: 'MOCK-NYC-001', name: 'Washington Heights Community Rx', address1: '601 W 181st St', city: 'New York', state: 'NY', postalCode: '10033', lat: 40.8510, lng: -73.9367, phone: '(212) 555-0301' },
  { id: 'pharm_nyc_002', externalId: 'MOCK-NYC-002', name: 'East Harlem Pharmacy', address1: '2082 Lexington Ave', city: 'New York', state: 'NY', postalCode: '10035', lat: 40.8003, lng: -73.9391, phone: '(212) 555-0302' },
  { id: 'pharm_nyc_003', externalId: 'MOCK-NYC-003', name: 'Lower East Side Rx', address1: '50 Delancey St', city: 'New York', state: 'NY', postalCode: '10002', lat: 40.7189, lng: -73.9905, phone: '(212) 555-0303' },
  { id: 'pharm_nyc_004', externalId: 'MOCK-NYC-004', name: 'Brooklyn Heights Pharmacy', address1: '142 Montague St', city: 'Brooklyn', state: 'NY', postalCode: '11201', lat: 40.6948, lng: -73.9938, phone: '(718) 555-0304' },
  { id: 'pharm_nyc_005', externalId: 'MOCK-NYC-005', name: 'Flushing Health Rx', address1: '41-60 Main St', city: 'Flushing', state: 'NY', postalCode: '11355', lat: 40.7575, lng: -73.8301, phone: '(718) 555-0305' },
];

@Injectable()
export class MockPharmacyDirectoryProvider implements PharmacyDirectoryProvider {
  async findNearby(point: GeoPoint, radiusMiles: number, limit: number): Promise<PharmacyRef[]> {
    return SEED.map((p) => ({
      id: p.id,
      externalId: p.externalId,
      name: p.name,
      address1: p.address1,
      city: p.city,
      state: p.state,
      postalCode: p.postalCode,
      lat: p.lat,
      lng: p.lng,
      phone: p.phone,
      distanceMiles: haversineMiles(point, { lat: p.lat, lng: p.lng }),
    }))
      .filter((p) => p.distanceMiles <= radiusMiles)
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
      .slice(0, limit);
  }

  async getById(id: string): Promise<PharmacyRef | null> {
    const row = SEED.find((p) => p.id === id);
    if (!row) return null;
    return { ...row, distanceMiles: 0 };
  }
}

// Great-circle distance in miles between two coordinates.
function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export { SEED as MOCK_PHARMACY_SEED };
