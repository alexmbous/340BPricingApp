/**
 * Local dev seed. Creates:
 *   • ApexCare Health Network (ParentOrganization)
 *   • 3 ApexCare Organizations
 *   • 1 SUPER_ADMIN, 1 PARENT_ADMIN, 1 ORG_ADMIN per org, 2 PATIENT per org
 *   • Medications (RxNorm subset) from the mock drug catalog
 *   • Pharmacies from the mock directory
 *   • PharmacyNetworkEligibility: mark the first 3 Chicago pharmacies as
 *     340B-eligible for ApexCare Family Medicine (the only CE in the seed).
 *   • 2 PatientMedication assignments per patient
 *
 * Credentials are printed at the end. Dev-only.
 */
import { DrugForm, PrismaClient, Role, PriceType } from '@prisma/client';
import * as argon2 from 'argon2';

import { MOCK_DRUG_SEED } from '../src/providers/drug-catalog/mock-drug-catalog.provider';
import { MOCK_PHARMACY_SEED } from '../src/providers/pharmacy-directory/mock-pharmacy-directory.provider';

const prisma = new PrismaClient();

// Dev-only passwords. Change any time — the seed resets state.
const PWD_SUPER = 'Sup3rAdmin!Seed';
const PWD_PARENT = 'ParentAdmin!Seed';
const PWD_ORG = 'OrgAdmin!Seed';
const PWD_PATIENT = 'Patient!Seed';

async function main(): Promise<void> {
  console.info('Seeding ApexCare local development data…');

  // ── Drugs ────────────────────────────────────────────────────
  for (const d of MOCK_DRUG_SEED) {
    const med = await prisma.medication.upsert({
      where: { rxcui: d.rxcui },
      create: {
        rxcui: d.rxcui,
        name: d.name,
        strength: d.strength,
        form: d.form as DrugForm,
        displayName: `${d.name} ${d.strength} ${d.form.toLowerCase()}`,
      },
      update: {
        name: d.name,
        strength: d.strength,
        form: d.form as DrugForm,
      },
    });
    for (const code of d.ndcCodes) {
      await prisma.drugCodeMapping.upsert({
        where: { system_code: { system: 'NDC', code } },
        create: { medicationId: med.id, system: 'NDC', code },
        update: {},
      });
    }
  }

  // ── Pharmacies ───────────────────────────────────────────────
  for (const p of MOCK_PHARMACY_SEED) {
    await prisma.pharmacy.upsert({
      where: { externalId: p.externalId },
      create: {
        id: p.id,
        externalId: p.externalId,
        name: p.name,
        address1: p.address1,
        city: p.city,
        state: p.state,
        postalCode: p.postalCode,
        lat: p.lat,
        lng: p.lng,
        phone: p.phone,
      },
      update: {},
    });
  }

  // ── Parent + Organizations ───────────────────────────────────
  const parent = await prisma.parentOrganization.upsert({
    where: { id: 'seed_parent_apexcare' },
    create: { id: 'seed_parent_apexcare', name: 'ApexCare Health Network' },
    update: {},
  });

  const orgs = await Promise.all([
    prisma.organization.upsert({
      where: { id: 'seed_org_family' },
      create: {
        id: 'seed_org_family',
        parentOrganizationId: parent.id,
        name: 'ApexCare Family Medicine',
        isCoveredEntity340B: true,
        covered340BId: '340B-APEXCARE-FM-01',
      },
      update: {
        isCoveredEntity340B: true,
        covered340BId: '340B-APEXCARE-FM-01',
      },
    }),
    prisma.organization.upsert({
      where: { id: 'seed_org_internal' },
      create: {
        id: 'seed_org_internal',
        parentOrganizationId: parent.id,
        name: 'ApexCare Internal Medicine',
      },
      update: {},
    }),
    prisma.organization.upsert({
      where: { id: 'seed_org_community' },
      create: {
        id: 'seed_org_community',
        parentOrganizationId: parent.id,
        name: 'ApexCare Community Clinic',
      },
      update: {},
    }),
  ]);

  // ── 340B contract network: first 3 Chicago pharmacies for Family Medicine
  const chicago = await prisma.pharmacy.findMany({
    where: { state: 'IL', city: 'Chicago' },
    take: 3,
    orderBy: { externalId: 'asc' },
  });
  for (const ph of chicago) {
    await prisma.pharmacyNetworkEligibility.upsert({
      where: {
        pharmacyId_organizationId_priceType: {
          pharmacyId: ph.id,
          organizationId: 'seed_org_family',
          priceType: 'CONTRACT_340B' as PriceType,
        },
      },
      create: {
        pharmacyId: ph.id,
        organizationId: 'seed_org_family',
        priceType: 'CONTRACT_340B' as PriceType,
        source: 'contract',
      },
      update: {},
    });
  }

  // ── Users ────────────────────────────────────────────────────
  const superAdmin = await upsertUser({
    email: 'super@apexcare.test',
    password: PWD_SUPER,
    role: 'SUPER_ADMIN',
    admin: { firstName: 'Platform', lastName: 'Admin', title: 'Super Admin' },
  });

  const parentAdmin = await upsertUser({
    email: 'parent@apexcare.test',
    password: PWD_PARENT,
    role: 'PARENT_ADMIN',
    parentOrganizationId: parent.id,
    admin: { firstName: 'Parker', lastName: 'Owens', title: 'Network Director' },
  });

  const orgAdmins: Array<{ email: string; orgId: string }> = [];
  for (const org of orgs) {
    const admin = await upsertUser({
      email: `admin.${slug(org.name)}@apexcare.test`,
      password: PWD_ORG,
      role: 'ORG_ADMIN',
      parentOrganizationId: parent.id,
      organizationId: org.id,
      admin: {
        firstName: 'Rita',
        lastName: 'Sullivan',
        title: 'Practice Manager',
      },
    });
    orgAdmins.push({ email: admin.email, orgId: org.id });
  }

  // Default preferred pharmacy per org. Family Medicine gets one of its
  // 340B-contracted pharmacies so the demo shows 340B pricing out of the
  // box; the other orgs get a nearby pharmacy without a contract (so the
  // guardrail correctly falls back to retail cash).
  const preferredByOrg: Record<string, string | null> = {
    seed_org_family: chicago[0]?.id ?? null,
    seed_org_internal: chicago[2]?.id ?? null,
    seed_org_community: chicago[1]?.id ?? null,
  };

  const patientCreds: Array<{ email: string; org: string }> = [];
  for (const org of orgs) {
    const patients = [
      { first: 'Alex', last: 'Martinez', dob: '1984-04-12' },
      { first: 'Jordan', last: 'Chen', dob: '1991-09-23' },
    ];
    for (const p of patients) {
      const email = `${p.first.toLowerCase()}.${p.last.toLowerCase()}.${slug(org.name)}@apexcare.test`;
      const user = await upsertUser({
        email,
        password: PWD_PATIENT,
        role: 'PATIENT',
        parentOrganizationId: parent.id,
        organizationId: org.id,
      });
      const preferredPharmacyId = preferredByOrg[org.id] ?? null;
      const profile = await prisma.patientProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          organizationId: org.id,
          firstName: p.first,
          lastName: p.last,
          dateOfBirth: new Date(p.dob),
          preferredPharmacyId,
          eligibility340BAsserted: org.id === 'seed_org_family',
          eligibilityAssertedBy:
            org.id === 'seed_org_family' ? orgAdmins.find((a) => a.orgId === org.id)?.email ?? null : null,
          eligibilityAssertedAt: org.id === 'seed_org_family' ? new Date() : null,
        },
        update: { preferredPharmacyId },
      });
      patientCreds.push({ email, org: org.name });

      // Assign 2 starter meds
      const orgAdminUser = await prisma.user.findUnique({
        where: { email: orgAdmins.find((a) => a.orgId === org.id)!.email },
      });
      // Starter fills — standard 30-day/90-day mix. Atorvastatin @ 90
      // tablets shows off the bulk-discount price tier; Lisinopril @ 30
      // is the everyday fill.
      const starters: Array<{ rxcui: string; quantity: number }> = [
        { rxcui: '617314', quantity: 90 }, // atorvastatin 20mg
        { rxcui: '197381', quantity: 30 }, // lisinopril 10mg
      ];
      for (const s of starters) {
        const med = await prisma.medication.findUnique({ where: { rxcui: s.rxcui } });
        if (med && orgAdminUser) {
          const existing = await prisma.patientMedication.findFirst({
            where: { patientId: profile.id, medicationId: med.id, removedAt: null },
          });
          if (!existing) {
            await prisma.patientMedication.create({
              data: {
                patientId: profile.id,
                medicationId: med.id,
                assignedByUserId: orgAdminUser.id,
                quantity: s.quantity,
              },
            });
          } else if (existing.quantity !== s.quantity) {
            await prisma.patientMedication.update({
              where: { id: existing.id },
              data: { quantity: s.quantity },
            });
          }
        }
      }
    }
  }

  console.info('\n─────────────────────────────────────────────');
  console.info('  Seed complete — dev credentials');
  console.info('─────────────────────────────────────────────');
  console.info(`  SUPER_ADMIN   : ${superAdmin.email} / ${PWD_SUPER}`);
  console.info(`  PARENT_ADMIN  : ${parentAdmin.email} / ${PWD_PARENT}`);
  for (const a of orgAdmins) console.info(`  ORG_ADMIN     : ${a.email} / ${PWD_ORG}`);
  for (const p of patientCreds) console.info(`  PATIENT [${p.org}]: ${p.email} / ${PWD_PATIENT}`);
  console.info('─────────────────────────────────────────────\n');
}

interface UpsertUserInput {
  email: string;
  password: string;
  role: Role;
  parentOrganizationId?: string;
  organizationId?: string;
  admin?: { firstName: string; lastName: string; title?: string };
}

async function upsertUser(input: UpsertUserInput): Promise<{ id: string; email: string }> {
  const email = input.email.toLowerCase();
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role: input.role,
      parentOrganizationId: input.parentOrganizationId,
      organizationId: input.organizationId,
    },
    update: {
      passwordHash,
      role: input.role,
      parentOrganizationId: input.parentOrganizationId,
      organizationId: input.organizationId,
    },
  });
  if (input.admin) {
    await prisma.adminProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        firstName: input.admin.firstName,
        lastName: input.admin.lastName,
        title: input.admin.title,
      },
      update: {
        firstName: input.admin.firstName,
        lastName: input.admin.lastName,
        title: input.admin.title,
      },
    });
  }
  return { id: user.id, email: user.email };
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
