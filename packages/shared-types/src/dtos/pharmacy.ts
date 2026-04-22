import { z } from 'zod';

export interface PharmacyDto {
  id: string;
  name: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  lat: number;
  lng: number;
  phone: string | null;
  distanceMiles?: number;
}

export const NearbyPharmacyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusMiles: z.coerce.number().min(0.5).max(50).default(10),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type NearbyPharmacyQuery = z.infer<typeof NearbyPharmacyQuerySchema>;
