import type { MedicationDto } from '@apexcare/shared-types';
import { useQuery } from '@tanstack/react-query';


import { api } from '../../lib/api-client';

export const medicationSearchKey = (q: string) => ['medications', 'search', q] as const;

export function useMedicationSearch(query: string) {
  const trimmed = query.trim();
  return useQuery<MedicationDto[]>({
    queryKey: medicationSearchKey(trimmed),
    queryFn: () => api.searchMedications({ name: trimmed, limit: 30 }),
    enabled: trimmed.length >= 2,
    staleTime: 5 * 60_000,
  });
}
