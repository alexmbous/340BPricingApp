export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PharmacyRef {
  id: string; // our internal id (directory-scoped)
  externalId?: string; // e.g. NCPDP id if known
  name: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  lat: number;
  lng: number;
  phone?: string;
  distanceMiles: number;
}

export interface PharmacyDirectoryProvider {
  findNearby(point: GeoPoint, radiusMiles: number, limit: number): Promise<PharmacyRef[]>;

  getById(id: string): Promise<PharmacyRef | null>;
}
