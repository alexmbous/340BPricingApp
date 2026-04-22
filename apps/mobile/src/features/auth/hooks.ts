import type { PatientDto, PatientMedicationWithPriceDto } from '@apexcare/shared-types';
import { useQuery } from '@tanstack/react-query';


import { api } from '../../lib/api-client';
import { useAuthStore } from '../../state/auth';

export const myPatientProfileKey = ['me', 'patient-profile'] as const;
export const myMedicationsKey = ['me', 'medications'] as const;

export function useMyPatientProfile() {
  const user = useAuthStore((s) => s.user);
  return useQuery<PatientDto>({
    queryKey: myPatientProfileKey,
    queryFn: () => api.myPatientProfile(),
    enabled: !!user && user.role === 'PATIENT',
    staleTime: 60_000,
  });
}

/**
 * Assigned medications + best quote at the patient's preferred pharmacy,
 * served from GET /v1/me/medications. The API writes an audit log entry
 * for each call (pricing.lookup).
 */
export function useMyMedicationsWithPrices() {
  const user = useAuthStore((s) => s.user);
  return useQuery<PatientMedicationWithPriceDto[]>({
    queryKey: myMedicationsKey,
    queryFn: () => api.myMedicationsWithPrices(),
    enabled: !!user && user.role === 'PATIENT',
    staleTime: 60_000,
  });
}
