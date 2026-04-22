import { z } from 'zod';

export interface ZipGeocodeResultDto {
  postalCode: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export const ResolveZipQuerySchema = z.object({
  zip: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, 'Expected a 5-digit US ZIP (optionally ZIP+4)'),
});
export type ResolveZipQuery = z.infer<typeof ResolveZipQuerySchema>;
