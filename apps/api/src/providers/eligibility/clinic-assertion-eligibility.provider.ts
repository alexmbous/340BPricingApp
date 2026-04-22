
import type {
  EligibilityDecision,
  EligibilityInput,
  EligibilityProvider,
} from '@apexcare/providers-contracts';
import { PriceTypes } from '@apexcare/shared-types';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

/**
 * v1 eligibility: the doctor office's stored assertion plus the org's
 * contract-pharmacy network. This is intentionally conservative —
 * eligibility is always a NO unless every condition is explicit.
 */
@Injectable()
export class ClinicAssertionEligibilityProvider implements EligibilityProvider {
  constructor(private readonly prisma: PrismaService) {}

  async isEligible(input: EligibilityInput): Promise<EligibilityDecision> {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { id: input.patientId },
      include: { organization: true },
    });
    if (!patient) {
      return { eligible: false, programType: null, reason: 'Patient not found' };
    }
    if (!patient.organization.isCoveredEntity340B) {
      return {
        eligible: false,
        programType: null,
        reason: 'Your clinic is not a 340B covered entity.',
      };
    }
    if (!patient.eligibility340BAsserted) {
      return {
        eligible: false,
        programType: null,
        reason: 'Your clinic has not marked you as eligible for 340B.',
      };
    }
    const contract = await this.prisma.pharmacyNetworkEligibility.findFirst({
      where: {
        pharmacyId: input.pharmacyId,
        organizationId: patient.organizationId,
        priceType: PriceTypes.CONTRACT_340B,
        activeFrom: { lte: new Date() },
        OR: [{ activeTo: null }, { activeTo: { gt: new Date() } }],
      },
    });
    if (!contract) {
      return {
        eligible: false,
        programType: null,
        reason: 'This pharmacy is not in your clinic’s 340B contract network.',
      };
    }
    return {
      eligible: true,
      programType: PriceTypes.CONTRACT_340B,
      reason: 'Pharmacy is in your clinic’s 340B contract network and your clinic has marked you eligible.',
    };
  }
}
