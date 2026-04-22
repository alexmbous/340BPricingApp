import { useQuery } from '@tanstack/react-query';

import type { ZipGeocodeResultDto } from '@apexcare/shared-types';

import { api } from '../../lib/api-client';

export const resolveZipKey = (zip: string) => ['locations', 'resolve-zip', zip] as const;

/**
 * Resolves a ZIP code to a centroid. Disabled until the caller passes a
 * full 5-digit ZIP — avoids firing on every keystroke.
 */
export function useResolveZip(zip: string) {
  const normalized = zip.trim();
  const ready = /^\d{5}(-\d{4})?$/.test(normalized);
  return useQuery<ZipGeocodeResultDto>({
    queryKey: resolveZipKey(normalized),
    queryFn: () => api.resolveZip(normalized),
    enabled: ready,
    staleTime: 60 * 60_000,
    retry: false,
  });
}
