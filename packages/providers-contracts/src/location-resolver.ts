/**
 * Resolves a US postal code to a canonical centroid (and city/state for
 * UX copy). v1 impl is a seeded lookup; future: Google Maps Geocoding,
 * Smarty, or a USPS-licensed vendor plugged in behind this interface.
 */
export interface ZipResolution {
  postalCode: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export interface LocationResolverProvider {
  resolveZip(zip: string): Promise<ZipResolution | null>;
}
