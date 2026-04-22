import type {
  AssignMedicationRequest,
  CreatePatientRequest,
  PatientDto,
  PatientMedicationDto,
  Page,
} from '@apexcare/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';


import { api } from '../../lib/api-client';

// ── Lists ────────────────────────────────────────────────────────
export const patientsListKey = (organizationId: string, q: string) =>
  ['patients', 'list', organizationId, q] as const;

export function usePatientsList(organizationId: string | null | undefined, query: string) {
  const q = query.trim();
  return useQuery<Page<PatientDto>>({
    queryKey: patientsListKey(organizationId ?? '', q),
    queryFn: () => api.listPatients(organizationId!, { q: q || undefined }),
    enabled: !!organizationId,
    staleTime: 30_000,
  });
}

// ── Detail ───────────────────────────────────────────────────────
export const patientKey = (id: string) => ['patients', id] as const;

export function usePatient(id: string | undefined) {
  return useQuery<PatientDto>({
    queryKey: patientKey(id ?? ''),
    queryFn: () => api.getPatient(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

// ── Medications for a patient ────────────────────────────────────
export const patientMedicationsKey = (id: string) => ['patients', id, 'medications'] as const;

export function usePatientMedications(id: string | undefined) {
  return useQuery<PatientMedicationDto[]>({
    queryKey: patientMedicationsKey(id ?? ''),
    queryFn: () => api.listPatientMedications(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

// ── Mutations ────────────────────────────────────────────────────
export function useCreatePatient(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePatientRequest) => api.createPatient(organizationId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['patients', 'list', organizationId] });
    },
  });
}

export function useAssignMedication(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignMedicationRequest) => api.assignMedication(patientId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: patientMedicationsKey(patientId) });
      void qc.invalidateQueries({ queryKey: patientKey(patientId) });
    },
  });
}

export function useUpdatePatient(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.updatePatient>[1]) =>
      api.updatePatient(patientId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: patientKey(patientId) });
    },
  });
}
