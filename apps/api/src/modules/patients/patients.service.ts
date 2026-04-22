
import type { PricingProvider } from '@apexcare/providers-contracts';
import type {
  AssignMedicationRequest,
  CreatePatientRequest,
  DrugForm,
  PatientDto,
  PatientMedicationDto,
  PatientMedicationWithPriceDto,
  PharmacyDto,
  UpdatePatientRequest,
} from '@apexcare/shared-types';
import {
  DEFAULT_PACK_SIZES_BY_FORM,
  PACK_UNIT_BY_FORM,
  getPackOptionsForForm,
  PriceTypes,
  Roles,
} from '@apexcare/shared-types';
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { clampLimit } from '../../common/pipes/cursor.util';
import { actorCanReachOrganization } from '../../common/tenancy/tenant-scope';
import type { AuthActor } from '../../common/types/auth-actor';
import { PrismaService } from '../../prisma/prisma.service';
import { PRICING_PROVIDER } from '../../providers/pricing/pricing.tokens';
import { UsersService } from '../users/users.service';

// Keep the Prisma `include` shape in one place so all read paths stay
// consistent and `toDto` never hits a missing field.
const PATIENT_INCLUDE = {
  user: { select: { email: true } },
  preferredPharmacy: true,
  organization: { select: { name: true, parentOrganizationId: true } },
} as const;

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    @Inject(PRICING_PROVIDER)
    private readonly pricing: PricingProvider,
  ) {}

  async list(
    actor: AuthActor,
    organizationId: string,
    cursor: string | undefined,
    limit: number | undefined,
    query: string | undefined,
  ): Promise<{ items: PatientDto[]; nextCursor: string | null; limit: number }> {
    const org = await this.requireReachableOrg(actor, organizationId);
    const take = clampLimit(limit);
    const trimmed = query?.trim();
    const rows = await this.prisma.patientProfile.findMany({
      where: {
        organizationId: org.id,
        ...(trimmed && {
          OR: [
            { firstName: { contains: trimmed, mode: 'insensitive' } },
            { lastName: { contains: trimmed, mode: 'insensitive' } },
            { user: { email: { contains: trimmed.toLowerCase() } } },
          ],
        }),
      },
      include: PATIENT_INCLUDE,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
      take: take + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    const hasMore = rows.length > take;
    const items = (hasMore ? rows.slice(0, take) : rows).map(toDto);
    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null, limit: take };
  }

  async get(actor: AuthActor, patientId: string): Promise<PatientDto> {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: PATIENT_INCLUDE,
    });
    if (!patient) throw new NotFoundException('Patient not found');
    this.enforceAccess(actor, patient.organizationId, patient.organization.parentOrganizationId, patient.userId);
    return toDto(patient);
  }

  async getSelf(actor: AuthActor): Promise<PatientDto> {
    if (actor.role !== Roles.PATIENT) {
      throw new ForbiddenException('Only patients have a patient profile');
    }
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId: actor.userId },
      include: PATIENT_INCLUDE,
    });
    if (!patient) throw new NotFoundException('Patient profile missing for this user');
    return toDto(patient);
  }

  async create(
    actor: AuthActor,
    organizationId: string,
    input: CreatePatientRequest,
  ): Promise<PatientDto> {
    const org = await this.requireReachableOrg(actor, organizationId);

    // Patient user and profile created in a single transaction — they always
    // co-exist; avoids dangling User rows if profile creation fails.
    return this.prisma.$transaction(async (tx) => {
      const createdUser = await this.users.createUser({
        email: input.email,
        password: input.password,
        role: Roles.PATIENT,
        organizationId: org.id,
        parentOrganizationId: org.parentOrganizationId,
      });

      await tx.patientProfile.create({
        data: {
          userId: createdUser.id,
          organizationId: org.id,
          firstName: input.firstName,
          lastName: input.lastName,
          dateOfBirth: new Date(input.dateOfBirth),
          preferredPharmacyId: input.preferredPharmacyId,
        },
      });
      const full = await tx.patientProfile.findUniqueOrThrow({
        where: { userId: createdUser.id },
        include: PATIENT_INCLUDE,
      });
      return toDto(full);
    });
  }

  async update(
    actor: AuthActor,
    patientId: string,
    input: UpdatePatientRequest,
  ): Promise<PatientDto> {
    const existing = await this.prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: { organization: { select: { parentOrganizationId: true } } },
    });
    if (!existing) throw new NotFoundException('Patient not found');
    this.enforceAccess(actor, existing.organizationId, existing.organization.parentOrganizationId, existing.userId);

    if (actor.role === Roles.PATIENT && input.eligibility340BAsserted !== undefined) {
      // Patients cannot assert their own 340B eligibility — that's the
      // doctor office's call.
      throw new ForbiddenException('Only clinic admins can set eligibility');
    }

    await this.prisma.patientProfile.update({
      where: { id: patientId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        preferredPharmacyId: input.preferredPharmacyId,
        ...(input.eligibility340BAsserted !== undefined && {
          eligibility340BAsserted: input.eligibility340BAsserted,
          eligibilityAssertedBy: input.eligibility340BAsserted ? actor.userId : null,
          eligibilityAssertedAt: input.eligibility340BAsserted ? new Date() : null,
        }),
      },
    });
    const updated = await this.prisma.patientProfile.findUniqueOrThrow({
      where: { id: patientId },
      include: PATIENT_INCLUDE,
    });
    return toDto(updated);
  }

  async assignMedication(
    actor: AuthActor,
    patientId: string,
    input: AssignMedicationRequest,
  ): Promise<PatientMedicationDto> {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: { organization: { select: { parentOrganizationId: true } } },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    this.enforceAccess(actor, patient.organizationId, patient.organization.parentOrganizationId, patient.userId);

    if (actor.role === Roles.PATIENT) {
      throw new ForbiddenException('Patients cannot assign medications');
    }

    const medication = await this.prisma.medication.findUnique({
      where: { id: input.medicationId },
    });
    if (!medication) throw new NotFoundException('Medication not found');

    const quantity = input.quantity ?? defaultQuantityForForm(medication.form);

    // Prevent duplicate active assignments silently — surface the existing row.
    const existingActive = await this.prisma.patientMedication.findFirst({
      where: { patientId, medicationId: input.medicationId, removedAt: null },
    });
    if (existingActive) {
      return toMedicationDto(existingActive, medication, actor);
    }

    const row = await this.prisma.patientMedication.create({
      data: {
        patientId,
        medicationId: input.medicationId,
        assignedByUserId: actor.userId,
        quantity,
        notes: input.notes,
      },
      include: { medication: true },
    });

    const assignedBy = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { adminProfile: true },
    });

    return {
      id: row.id,
      medication: medicationToDto(row.medication),
      quantity: row.quantity,
      quantityUnit: PACK_UNIT_BY_FORM[row.medication.form],
      notes: row.notes,
      assignedAt: row.assignedAt.toISOString(),
      assignedBy: {
        id: actor.userId,
        displayName: assignedBy?.adminProfile
          ? `${assignedBy.adminProfile.firstName} ${assignedBy.adminProfile.lastName}`
          : actor.email,
      },
    };
  }

  async listMedications(actor: AuthActor, patientId: string): Promise<PatientMedicationDto[]> {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: { organization: { select: { parentOrganizationId: true } } },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    this.enforceAccess(actor, patient.organizationId, patient.organization.parentOrganizationId, patient.userId);

    const rows = await this.prisma.patientMedication.findMany({
      where: { patientId, removedAt: null },
      include: {
        medication: true,
      },
      orderBy: { assignedAt: 'desc' },
    });
    if (rows.length === 0) return [];
    const byIds = await this.prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.assignedByUserId) } },
      include: { adminProfile: true },
    });
    const byMap = new Map(byIds.map((u) => [u.id, u]));

    return rows.map((r): PatientMedicationDto => {
      const assigner = byMap.get(r.assignedByUserId);
      return {
        id: r.id,
        medication: medicationToDto(r.medication),
        quantity: r.quantity,
        quantityUnit: PACK_UNIT_BY_FORM[r.medication.form],
        notes: r.notes,
        assignedAt: r.assignedAt.toISOString(),
        assignedBy: {
          id: r.assignedByUserId,
          displayName: assigner?.adminProfile
            ? `${assigner.adminProfile.firstName} ${assigner.adminProfile.lastName}`
            : (assigner?.email ?? 'Unknown'),
        },
      };
    });
  }

  /**
   * Patient-self medication list with best price at the assigned preferred
   * pharmacy. If the patient has no preferred pharmacy set by their clinic,
   * each row's bestPriceAtPreferredPharmacy is null — the UI should nudge
   * them to compare nearby pharmacies instead. We run the guardrail here
   * (same rule as PricingService.compare) so we never show a 340B price
   * the patient is not eligible for.
   */
  async getSelfMedicationsWithPrices(
    actor: AuthActor,
  ): Promise<PatientMedicationWithPriceDto[]> {
    if (actor.role !== Roles.PATIENT) {
      throw new ForbiddenException('Only patients have a medication list of their own');
    }
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId: actor.userId },
      include: { preferredPharmacy: true, organization: true },
    });
    if (!patient) throw new NotFoundException('Patient profile missing for this user');

    const rows = await this.prisma.patientMedication.findMany({
      where: { patientId: patient.id, removedAt: null },
      include: { medication: true },
      orderBy: { assignedAt: 'desc' },
    });
    if (rows.length === 0) return [];

    const assignerIds = Array.from(new Set(rows.map((r) => r.assignedByUserId)));
    const assigners = await this.prisma.user.findMany({
      where: { id: { in: assignerIds } },
      include: { adminProfile: true },
    });
    const assignerMap = new Map(assigners.map((u) => [u.id, u]));

    const preferredPharmacy = patient.preferredPharmacy;
    const preferredDto: PharmacyDto | null = preferredPharmacy
      ? {
          id: preferredPharmacy.id,
          name: preferredPharmacy.name,
          address1: preferredPharmacy.address1,
          city: preferredPharmacy.city,
          state: preferredPharmacy.state,
          postalCode: preferredPharmacy.postalCode,
          lat: preferredPharmacy.lat,
          lng: preferredPharmacy.lng,
          phone: preferredPharmacy.phone,
        }
      : null;

    // Resolve the 340B eligibility envelope ONCE: whether the org is a
    // covered entity, whether the patient is asserted, and whether the
    // preferred pharmacy is in the org's contract network. Same guardrail
    // as PricingService.compare — keep them consistent.
    const orgIsCE = patient.organization.isCoveredEntity340B;
    const patientAsserted = patient.eligibility340BAsserted;
    let preferredIs340BContracted = false;
    if (preferredPharmacy && orgIsCE) {
      const contract = await this.prisma.pharmacyNetworkEligibility.findFirst({
        where: {
          pharmacyId: preferredPharmacy.id,
          organizationId: patient.organizationId,
          priceType: PriceTypes.CONTRACT_340B,
          activeFrom: { lte: new Date() },
          OR: [{ activeTo: null }, { activeTo: { gt: new Date() } }],
        },
        select: { id: true },
      });
      preferredIs340BContracted = !!contract;
    }
    const can340B = orgIsCE && patientAsserted && preferredIs340BContracted;

    // Fetch quotes per rxcui. The pricing provider signature takes one
    // rxcui per call, so we parallelize — fine for the typical 2–10 meds
    // a patient carries. A batched provider contract is a v1.1 nice-to-have.
    const results = await Promise.all(
      rows.map(async (r): Promise<PatientMedicationWithPriceDto> => {
        const baseDto: PatientMedicationDto = buildBaseDto(r, assignerMap);
        if (!preferredPharmacy) {
          return { ...baseDto, preferredPharmacy: null, bestPriceAtPreferredPharmacy: null };
        }
        const unit = PACK_UNIT_BY_FORM[r.medication.form];
        try {
          const quotes = await this.pricing.getQuotes({
            rxcui: r.medication.rxcui,
            pharmacyIds: [preferredPharmacy.id],
            quantity: r.quantity,
            unit,
            patientContext: {
              organizationId: patient.organizationId,
              eligibilityHints: can340B
                ? [{ programType: PriceTypes.CONTRACT_340B, organizationId: patient.organizationId }]
                : [],
            },
          });
          // Filter out 340B quotes the guardrail disallows, then pick lowest.
          const allowed = quotes.filter(
            (q) => q.priceType !== PriceTypes.CONTRACT_340B || can340B,
          );
          if (allowed.length === 0) {
            return { ...baseDto, preferredPharmacy: preferredDto, bestPriceAtPreferredPharmacy: null };
          }
          allowed.sort((a, b) => a.amountCents - b.amountCents);
          const best = allowed[0]!;
          return {
            ...baseDto,
            preferredPharmacy: preferredDto,
            bestPriceAtPreferredPharmacy: {
              amountCents: best.amountCents,
              unitPriceCents: best.unitPriceCents,
              quantity: best.quantity,
              unit: best.unit,
              currency: best.currency,
              priceType: best.priceType,
              is340BEligibleDisplay: best.priceType === PriceTypes.CONTRACT_340B && can340B,
              fetchedAt: best.fetchedAt.toISOString(),
            },
          };
        } catch {
          // One bad price shouldn't fail the whole list.
          return { ...baseDto, preferredPharmacy: preferredDto, bestPriceAtPreferredPharmacy: null };
        }
      }),
    );

    return results;
  }

  private async requireReachableOrg(
    actor: AuthActor,
    organizationId: string,
  ): Promise<{ id: string; parentOrganizationId: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, parentOrganizationId: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    if (!actorCanReachOrganization(actor, org.id, org.parentOrganizationId)) {
      throw new ForbiddenException('Organization outside your scope');
    }
    return org;
  }

  private enforceAccess(
    actor: AuthActor,
    orgId: string,
    parentOrgId: string,
    patientUserId: string,
  ): void {
    if (actor.role === Roles.PATIENT) {
      if (patientUserId !== actor.userId) throw new ForbiddenException();
      return;
    }
    if (!actorCanReachOrganization(actor, orgId, parentOrgId)) {
      throw new ForbiddenException('Patient outside your scope');
    }
  }
}

interface PatientRow {
  id: string;
  userId: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  preferredPharmacyId: string | null;
  eligibility340BAsserted: boolean;
  eligibilityAssertedAt: Date | null;
  createdAt: Date;
  user: { email: string };
  organization: { name: string; parentOrganizationId: string };
  preferredPharmacy: {
    id: string;
    name: string;
    address1: string;
    city: string;
    state: string;
    postalCode: string;
    lat: number;
    lng: number;
    phone: string | null;
  } | null;
}

function toDto(p: PatientRow): PatientDto {
  const pref: PharmacyDto | null = p.preferredPharmacy
    ? {
        id: p.preferredPharmacy.id,
        name: p.preferredPharmacy.name,
        address1: p.preferredPharmacy.address1,
        city: p.preferredPharmacy.city,
        state: p.preferredPharmacy.state,
        postalCode: p.preferredPharmacy.postalCode,
        lat: p.preferredPharmacy.lat,
        lng: p.preferredPharmacy.lng,
        phone: p.preferredPharmacy.phone,
      }
    : null;
  return {
    id: p.id,
    userId: p.userId,
    organizationId: p.organizationId,
    organizationName: p.organization.name,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth.toISOString().slice(0, 10),
    email: p.user.email,
    preferredPharmacyId: p.preferredPharmacyId,
    preferredPharmacy: pref,
    eligibility340BAsserted: p.eligibility340BAsserted,
    eligibilityAssertedAt: p.eligibilityAssertedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

/**
 * Reusable converter — any place that has a Prisma Medication row can
 * produce a MedicationDto without re-computing pack options.
 */
function medicationToDto(m: {
  id: string;
  rxcui: string;
  name: string;
  strength: string;
  form: DrugForm;
  displayName: string;
}): PatientMedicationDto['medication'] {
  return {
    id: m.id,
    rxcui: m.rxcui,
    name: m.name,
    strength: m.strength,
    form: m.form,
    displayName: m.displayName,
    packOptions: getPackOptionsForForm(m.form),
    defaultQuantity: defaultQuantityForForm(m.form),
    quantityUnit: PACK_UNIT_BY_FORM[m.form],
  };
}

function defaultQuantityForForm(form: DrugForm): number {
  return DEFAULT_PACK_SIZES_BY_FORM[form][0] ?? 1;
}

function toMedicationDto(
  row: { id: string; assignedAt: Date; notes: string | null; quantity: number },
  medication: {
    id: string;
    rxcui: string;
    name: string;
    strength: string;
    form: DrugForm;
    displayName: string;
  },
  actor: AuthActor,
): PatientMedicationDto {
  return {
    id: row.id,
    medication: medicationToDto(medication),
    quantity: row.quantity,
    quantityUnit: PACK_UNIT_BY_FORM[medication.form],
    notes: row.notes,
    assignedAt: row.assignedAt.toISOString(),
    assignedBy: { id: actor.userId, displayName: actor.email },
  };
}

interface AssignerRow {
  id: string;
  email: string;
  adminProfile: { firstName: string; lastName: string } | null;
}

function buildBaseDto(
  row: {
    id: string;
    assignedAt: Date;
    notes: string | null;
    assignedByUserId: string;
    quantity: number;
    medication: {
      id: string;
      rxcui: string;
      name: string;
      strength: string;
      form: DrugForm;
      displayName: string;
    };
  },
  assignerMap: Map<string, AssignerRow>,
): PatientMedicationDto {
  const assigner = assignerMap.get(row.assignedByUserId);
  return {
    id: row.id,
    medication: medicationToDto(row.medication),
    quantity: row.quantity,
    quantityUnit: PACK_UNIT_BY_FORM[row.medication.form],
    notes: row.notes,
    assignedAt: row.assignedAt.toISOString(),
    assignedBy: {
      id: row.assignedByUserId,
      displayName: assigner?.adminProfile
        ? `${assigner.adminProfile.firstName} ${assigner.adminProfile.lastName}`
        : (assigner?.email ?? 'Unknown'),
    },
  };
}
