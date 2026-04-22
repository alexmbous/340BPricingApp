import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import type {
  EligibilityProvider,
  PharmacyDirectoryProvider,
  PricingProvider,
} from '@apexcare/providers-contracts';
import type {
  PricingCompareRequest,
  PricingCompareResponse,
  PricingQuoteDto,
} from '@apexcare/shared-types';
import {
  PACK_UNIT_BY_FORM,
  DEFAULT_PACK_SIZES_BY_FORM,
  PriceTypes,
  Roles,
} from '@apexcare/shared-types';

import type { AuthActor } from '../../common/types/auth-actor';
import { PrismaService } from '../../prisma/prisma.service';
import { PHARMACY_DIRECTORY_PROVIDER } from '../../providers/pharmacy-directory/pharmacy-directory.tokens';
import { PRICING_PROVIDER } from '../../providers/pricing/pricing.tokens';
import { ELIGIBILITY_PROVIDER } from '../../providers/eligibility/eligibility.tokens';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PRICING_PROVIDER) private readonly pricing: PricingProvider,
    @Inject(PHARMACY_DIRECTORY_PROVIDER) private readonly directory: PharmacyDirectoryProvider,
    @Inject(ELIGIBILITY_PROVIDER) private readonly eligibility: EligibilityProvider,
    private readonly audit: AuditService,
  ) {}

  async compare(actor: AuthActor, req: PricingCompareRequest): Promise<PricingCompareResponse> {
    // Resolve the medication so we know its form (→ unit + default fill).
    const medication = await this.prisma.medication.findUnique({
      where: { rxcui: req.rxcui },
    });
    if (!medication) throw new NotFoundException('Medication not found');
    const unit = PACK_UNIT_BY_FORM[medication.form];
    const defaultQuantity = DEFAULT_PACK_SIZES_BY_FORM[medication.form][0] ?? 1;
    const quantity = req.quantity ?? defaultQuantity;

    // Resolve patient context (optional). If actor is a patient, force
    // to self. If actor is an admin and patientId provided, verify scope.
    let patientOrgId: string | null = null;
    let patientId: string | null = null;
    let preferredPharmacyId: string | null = null;
    if (actor.role === Roles.PATIENT) {
      const p = await this.prisma.patientProfile.findUnique({
        where: { userId: actor.userId },
      });
      if (!p) throw new NotFoundException('Patient profile missing');
      patientOrgId = p.organizationId;
      patientId = p.id;
      preferredPharmacyId = p.preferredPharmacyId;
    } else if (req.patientId) {
      const p = await this.prisma.patientProfile.findUnique({
        where: { id: req.patientId },
        include: { organization: { select: { parentOrganizationId: true } } },
      });
      if (!p) throw new NotFoundException('Patient not found');
      if (actor.role === Roles.ORG_ADMIN && actor.organizationId !== p.organizationId) {
        throw new ForbiddenException();
      }
      if (
        actor.role === Roles.PARENT_ADMIN &&
        p.organization.parentOrganizationId !== actor.parentOrganizationId
      ) {
        throw new ForbiddenException();
      }
      patientOrgId = p.organizationId;
      patientId = p.id;
      preferredPharmacyId = p.preferredPharmacyId;
    }

    // 1. Load nearby pharmacies.
    const pharmacies = await this.directory.findNearby(
      { lat: req.location.lat, lng: req.location.lng },
      req.location.radiusMiles,
      req.limit,
    );
    if (pharmacies.length === 0) {
      return {
        quotes: [],
        fetchedAt: new Date().toISOString(),
        quantity,
        unit,
        preferredPharmacyId,
        preferredPharmacyInResults: false,
      };
    }

    // 2. Ensure local pharmacy rows exist (for FK integrity in quotes).
    for (const ph of pharmacies) {
      await this.prisma.pharmacy.upsert({
        where: ph.externalId ? { externalId: ph.externalId } : { id: ph.id },
        create: {
          id: ph.id,
          externalId: ph.externalId,
          name: ph.name,
          address1: ph.address1,
          city: ph.city,
          state: ph.state,
          postalCode: ph.postalCode,
          lat: ph.lat,
          lng: ph.lng,
          phone: ph.phone,
        },
        update: {},
      });
    }

    // 3. Build eligibility hints (what programs the patient's org has).
    const eligibilityHints = patientOrgId
      ? (
          await this.prisma.pharmacyNetworkEligibility.findMany({
            where: { organizationId: patientOrgId },
            select: { priceType: true, organizationId: true },
          })
        ).map((r) => ({ programType: r.priceType, organizationId: r.organizationId }))
      : [];

    // 4. Ask the pricing provider for quotes.
    const providerQuotes = await this.pricing.getQuotes({
      rxcui: req.rxcui,
      pharmacyIds: pharmacies.map((p) => p.id),
      quantity,
      unit,
      patientContext: { organizationId: patientOrgId, eligibilityHints },
    });

    // 5. Apply the 340B guardrail ─ the reason this service exists.
    //    A CONTRACT_340B quote is only shown when:
    //     - patient org is a covered entity
    //     - pharmacy has an active PharmacyNetworkEligibility row for
    //       (org, pharmacy, CONTRACT_340B)
    //     - patient has eligibility340BAsserted = true
    const pharmaciesById = new Map(pharmacies.map((p) => [p.id, p]));
    const contractRows = patientOrgId
      ? await this.prisma.pharmacyNetworkEligibility.findMany({
          where: {
            organizationId: patientOrgId,
            priceType: PriceTypes.CONTRACT_340B,
            pharmacyId: { in: pharmacies.map((p) => p.id) },
            activeFrom: { lte: new Date() },
            OR: [{ activeTo: null }, { activeTo: { gt: new Date() } }],
          },
          select: { pharmacyId: true },
        })
      : [];
    const contractedPharmacyIds = new Set(contractRows.map((r) => r.pharmacyId));

    let patientIs340BEligible = false;
    let orgIsCE = false;
    if (patientId && patientOrgId) {
      const [patient, org] = await Promise.all([
        this.prisma.patientProfile.findUnique({ where: { id: patientId } }),
        this.prisma.organization.findUnique({ where: { id: patientOrgId } }),
      ]);
      patientIs340BEligible = !!patient?.eligibility340BAsserted;
      orgIsCE = !!org?.isCoveredEntity340B;
    }

    const shaped: PricingQuoteDto[] = [];
    for (const q of providerQuotes) {
      const ph = pharmaciesById.get(q.pharmacyId);
      if (!ph) continue;

      const is340B = q.priceType === PriceTypes.CONTRACT_340B;
      const display340BAllowed =
        is340B && orgIsCE && patientIs340BEligible && contractedPharmacyIds.has(q.pharmacyId);

      // If a 340B quote cannot be displayed, suppress it entirely rather
      // than relabeling. Never mislead the patient about the price class.
      if (is340B && !display340BAllowed) continue;

      shaped.push({
        pharmacy: {
          id: ph.id,
          name: ph.name,
          address1: ph.address1,
          city: ph.city,
          state: ph.state,
          postalCode: ph.postalCode,
          lat: ph.lat,
          lng: ph.lng,
          phone: ph.phone ?? null,
          distanceMiles: ph.distanceMiles,
        },
        priceType: q.priceType,
        amountCents: q.amountCents,
        unitPriceCents: q.unitPriceCents,
        quantity: q.quantity,
        unit: q.unit,
        currency: q.currency,
        sourceProvider: q.sourceProvider,
        fetchedAt: q.fetchedAt.toISOString(),
        expiresAt: q.expiresAt?.toISOString() ?? null,
        is340BEligibleDisplay: display340BAllowed,
        eligibilityReason: is340B
          ? display340BAllowed
            ? 'Pharmacy is in your clinic’s 340B contract network and your clinic has marked you eligible.'
            : undefined
          : undefined,
      });
    }

    // 6. Sort ascending — the core UX rule.
    shaped.sort((a, b) => a.amountCents - b.amountCents);

    // 7. Best-effort cache into pricing_quotes for offline / analytics.
    if (shaped.length > 0) {
      await this.prisma.pricingQuote.createMany({
        data: shaped.map((s) => ({
          rxcui: req.rxcui,
          pharmacyId: s.pharmacy.id,
          organizationId: patientOrgId,
          priceType: s.priceType,
          amountCents: s.amountCents,
          currency: s.currency,
          sourceProvider: s.sourceProvider,
          fetchedAt: new Date(s.fetchedAt),
          expiresAt: s.expiresAt ? new Date(s.expiresAt) : null,
        })),
        skipDuplicates: true,
      });
    }

    // Rich audit entry for pricing lookups. Metadata stays non-PHI (no name,
    // lat/lng, address). Lowest price is kept for engagement analytics.
    await this.audit.write({
      actorUserId: actor.userId,
      actorRole: actor.role,
      organizationId: actor.organizationId,
      parentOrganizationId: actor.parentOrganizationId,
      action: 'pricing.lookup',
      resourceType: 'medication',
      resourceId: req.rxcui,
      metadata: {
        rxcui: req.rxcui,
        pharmacyCount: pharmacies.length,
        quoteCount: shaped.length,
        minAmountCents: shaped[0]?.amountCents,
        quantity,
        unit,
        types: Array.from(new Set(shaped.map((s) => s.priceType))),
      },
    });

    const preferredPharmacyInResults =
      !!preferredPharmacyId && shaped.some((q) => q.pharmacy.id === preferredPharmacyId);

    return {
      quotes: shaped,
      fetchedAt: new Date().toISOString(),
      quantity,
      unit,
      preferredPharmacyId,
      preferredPharmacyInResults,
    };
  }
}
