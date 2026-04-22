import type { PricingCompareRequest, PricingCompareResponse } from '@apexcare/shared-types';
import { useQuery } from '@tanstack/react-query';


import { api } from '../../lib/api-client';

export const pricingCompareKey = (req: PricingCompareRequest) =>
  [
    'pricing',
    'compare',
    req.rxcui,
    req.location.lat.toFixed(3),
    req.location.lng.toFixed(3),
    req.location.radiusMiles,
    req.patientId ?? null,
    req.quantity ?? 'default',
  ] as const;

export function usePricingCompare(req: PricingCompareRequest | null) {
  return useQuery<PricingCompareResponse>({
    queryKey: req ? pricingCompareKey(req) : ['pricing', 'compare', 'none'],
    queryFn: () => api.comparePricing(req!),
    enabled: !!req,
    staleTime: 60_000,
  });
}
