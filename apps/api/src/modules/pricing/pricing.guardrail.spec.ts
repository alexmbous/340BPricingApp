/**
 * Unit coverage for the 340B guardrail.
 * The pricing service must suppress CONTRACT_340B quotes unless ALL of:
 *  - patient's org is a covered entity
 *  - org has an active PharmacyNetworkEligibility for (org, pharmacy, CONTRACT_340B)
 *  - patient has eligibility340BAsserted = true
 *
 * We mock the Prisma surface and provider deps so this is a pure unit test.
 */
import { Test } from '@nestjs/testing';

import { PriceTypes, Roles } from '@apexcare/shared-types';

import type { AuthActor } from '../../common/types/auth-actor';
import { PHARMACY_DIRECTORY_PROVIDER } from '../../providers/pharmacy-directory/pharmacy-directory.tokens';
import { PRICING_PROVIDER } from '../../providers/pricing/pricing.tokens';
import { ELIGIBILITY_PROVIDER } from '../../providers/eligibility/eligibility.tokens';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

import { PricingService } from './pricing.service';

const PATIENT_ID = 'pat_1';
const ORG_ID = 'org_1';
const PHARMACY_A = 'pharm_a'; // in contract
const PHARMACY_B = 'pharm_b'; // NOT in contract

function makePrisma(opts: {
  orgIsCoveredEntity: boolean;
  patientAsserted: boolean;
  contractedPharmacyIds: string[];
}): Partial<PrismaService> {
  return {
    patientProfile: {
      findUnique: jest.fn((args: { where: { id?: string; userId?: string } }) => {
        if (args.where.id === PATIENT_ID || args.where.userId === 'user_1') {
          return Promise.resolve({
            id: PATIENT_ID,
            userId: 'user_1',
            organizationId: ORG_ID,
            preferredPharmacyId: null,
            eligibility340BAsserted: opts.patientAsserted,
            organization: { parentOrganizationId: 'parent_1' },
          });
        }
        return Promise.resolve(null);
      }),
    } as unknown as PrismaService['patientProfile'],
    organization: {
      findUnique: jest.fn(() =>
        Promise.resolve({ id: ORG_ID, isCoveredEntity340B: opts.orgIsCoveredEntity }),
      ),
    } as unknown as PrismaService['organization'],
    pharmacyNetworkEligibility: {
      findMany: jest.fn((args: { where: { pharmacyId?: { in: string[] } } }) => {
        const requested = args.where.pharmacyId?.in ?? [];
        const hits = requested.filter((id) => opts.contractedPharmacyIds.includes(id));
        return Promise.resolve(hits.map((pharmacyId) => ({ pharmacyId })));
      }),
    } as unknown as PrismaService['pharmacyNetworkEligibility'],
    pharmacy: {
      upsert: jest.fn(() => Promise.resolve({})),
    } as unknown as PrismaService['pharmacy'],
    pricingQuote: {
      createMany: jest.fn(() => Promise.resolve({ count: 0 })),
    } as unknown as PrismaService['pricingQuote'],
  };
}

function nearby(): unknown {
  return {
    findNearby: jest.fn(() =>
      Promise.resolve([
        { id: PHARMACY_A, name: 'A', address1: '', city: '', state: '', postalCode: '', lat: 0, lng: 0, distanceMiles: 1 },
        { id: PHARMACY_B, name: 'B', address1: '', city: '', state: '', postalCode: '', lat: 0, lng: 0, distanceMiles: 2 },
      ]),
    ),
  };
}

function quotes(hints: string[]): unknown {
  return {
    getQuotes: jest.fn(() => {
      const base = [
        { pharmacyId: PHARMACY_A, priceType: PriceTypes.RETAIL_CASH, amountCents: 5000, currency: 'USD', sourceProvider: 'mock', fetchedAt: new Date() },
        { pharmacyId: PHARMACY_B, priceType: PriceTypes.RETAIL_CASH, amountCents: 4000, currency: 'USD', sourceProvider: 'mock', fetchedAt: new Date() },
      ];
      if (hints.includes(PriceTypes.CONTRACT_340B)) {
        base.push(
          { pharmacyId: PHARMACY_A, priceType: PriceTypes.CONTRACT_340B, amountCents: 800, currency: 'USD', sourceProvider: 'mock', fetchedAt: new Date() },
          { pharmacyId: PHARMACY_B, priceType: PriceTypes.CONTRACT_340B, amountCents: 700, currency: 'USD', sourceProvider: 'mock', fetchedAt: new Date() },
        );
      }
      return Promise.resolve(base);
    }),
  };
}

const PATIENT_ACTOR: AuthActor = {
  userId: 'user_1',
  role: Roles.PATIENT,
  email: 'p@x',
  parentOrganizationId: null,
  organizationId: ORG_ID,
  jti: 'j',
};

async function build(
  prisma: Partial<PrismaService>,
  pricingQuotes: unknown,
): Promise<PricingService> {
  const audit: Partial<AuditService> = { write: jest.fn(() => Promise.resolve()) };
  const mod = await Test.createTestingModule({
    providers: [
      PricingService,
      { provide: PrismaService, useValue: prisma },
      { provide: PRICING_PROVIDER, useValue: pricingQuotes },
      { provide: PHARMACY_DIRECTORY_PROVIDER, useValue: nearby() },
      { provide: ELIGIBILITY_PROVIDER, useValue: {} },
      { provide: AuditService, useValue: audit },
    ],
  }).compile();
  return mod.get(PricingService);
}

describe('PricingService 340B guardrail', () => {
  const req = {
    rxcui: '617314',
    location: { lat: 0, lng: 0, radiusMiles: 10 },
    limit: 10,
  };

  it('displays 340B when org is CE, contract exists, patient asserted', async () => {
    const svc = await build(
      makePrisma({ orgIsCoveredEntity: true, patientAsserted: true, contractedPharmacyIds: [PHARMACY_A] }),
      quotes([PriceTypes.CONTRACT_340B]),
    );
    const res = await svc.compare(PATIENT_ACTOR, req);
    const a340b = res.quotes.filter((q) => q.priceType === PriceTypes.CONTRACT_340B);
    expect(a340b).toHaveLength(1);
    expect(a340b[0]!.pharmacy.id).toBe(PHARMACY_A);
    expect(a340b[0]!.is340BEligibleDisplay).toBe(true);
  });

  it('suppresses 340B when pharmacy is NOT in the contract network', async () => {
    const svc = await build(
      makePrisma({ orgIsCoveredEntity: true, patientAsserted: true, contractedPharmacyIds: [PHARMACY_A] }),
      quotes([PriceTypes.CONTRACT_340B]),
    );
    const res = await svc.compare(PATIENT_ACTOR, req);
    const idsWith340B = res.quotes
      .filter((q) => q.priceType === PriceTypes.CONTRACT_340B)
      .map((q) => q.pharmacy.id);
    expect(idsWith340B).not.toContain(PHARMACY_B);
  });

  it('suppresses 340B when patient is NOT asserted', async () => {
    const svc = await build(
      makePrisma({ orgIsCoveredEntity: true, patientAsserted: false, contractedPharmacyIds: [PHARMACY_A, PHARMACY_B] }),
      quotes([PriceTypes.CONTRACT_340B]),
    );
    const res = await svc.compare(PATIENT_ACTOR, req);
    expect(res.quotes.every((q) => q.priceType !== PriceTypes.CONTRACT_340B)).toBe(true);
  });

  it('suppresses 340B when org is NOT a covered entity', async () => {
    const svc = await build(
      makePrisma({ orgIsCoveredEntity: false, patientAsserted: true, contractedPharmacyIds: [PHARMACY_A] }),
      quotes([PriceTypes.CONTRACT_340B]),
    );
    const res = await svc.compare(PATIENT_ACTOR, req);
    expect(res.quotes.every((q) => q.priceType !== PriceTypes.CONTRACT_340B)).toBe(true);
  });

  it('sorts strictly by lowest amountCents', async () => {
    const svc = await build(
      makePrisma({ orgIsCoveredEntity: true, patientAsserted: true, contractedPharmacyIds: [PHARMACY_A] }),
      quotes([PriceTypes.CONTRACT_340B]),
    );
    const res = await svc.compare(PATIENT_ACTOR, req);
    const amounts = res.quotes.map((q) => q.amountCents);
    expect([...amounts].sort((a, b) => a - b)).toEqual(amounts);
  });
});
