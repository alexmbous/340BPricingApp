-- ─────────────────────────────────────────────────────────────────
-- Initial schema for ApexCare 340B platform
-- Generated to match schema.prisma. Any subsequent schema changes
-- should go through `prisma migrate dev` to keep this file the
-- ground truth for fresh environments.
-- ─────────────────────────────────────────────────────────────────

-- Enums
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'PARENT_ADMIN', 'ORG_ADMIN', 'PATIENT');
CREATE TYPE "PriceType" AS ENUM ('RETAIL_CASH', 'DISCOUNT_CARD', 'CONTRACT_340B', 'INSURANCE_EST');
CREATE TYPE "DrugForm" AS ENUM ('TABLET', 'CAPSULE', 'SOLUTION', 'SUSPENSION', 'INJECTION', 'CREAM', 'OTHER');

-- ParentOrganization
CREATE TABLE "parent_organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "parent_organizations_pkey" PRIMARY KEY ("id")
);

-- Organization
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "parent_organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_covered_entity_340b" BOOLEAN NOT NULL DEFAULT false,
    "covered_340b_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "organizations_parent_organization_id_idx" ON "organizations"("parent_organization_id");

-- User
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "parent_organization_id" TEXT,
    "organization_id" TEXT,
    "mfa_enrolled" BOOLEAN NOT NULL DEFAULT false,
    "disabled_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");
CREATE INDEX "users_parent_organization_id_idx" ON "users"("parent_organization_id");
CREATE INDEX "users_role_idx" ON "users"("role");

-- AdminProfile
CREATE TABLE "admin_profiles" (
    "user_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "title" TEXT,
    CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("user_id")
);

-- PatientProfile
CREATE TABLE "patient_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "preferred_pharmacy_id" TEXT,
    "eligibility_340b_asserted" BOOLEAN NOT NULL DEFAULT false,
    "eligibility_asserted_by" TEXT,
    "eligibility_asserted_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "patient_profiles_user_id_key" ON "patient_profiles"("user_id");
CREATE INDEX "patient_profiles_organization_id_idx" ON "patient_profiles"("organization_id");
CREATE INDEX "patient_profiles_last_name_first_name_idx" ON "patient_profiles"("last_name", "first_name");

-- Medication
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "rxcui" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "form" "DrugForm" NOT NULL,
    "display_name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "medications_rxcui_key" ON "medications"("rxcui");
CREATE INDEX "medications_name_idx" ON "medications"("name");

-- DrugCodeMapping
CREATE TABLE "drug_code_mappings" (
    "id" TEXT NOT NULL,
    "medication_id" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    CONSTRAINT "drug_code_mappings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "drug_code_mappings_system_code_key" ON "drug_code_mappings"("system", "code");
CREATE INDEX "drug_code_mappings_medication_id_idx" ON "drug_code_mappings"("medication_id");

-- PatientMedication
CREATE TABLE "patient_medications" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "medication_id" TEXT NOT NULL,
    "assigned_by_user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP(3),
    "notes" TEXT,
    CONSTRAINT "patient_medications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "patient_medications_patient_id_idx" ON "patient_medications"("patient_id");
CREATE INDEX "patient_medications_medication_id_idx" ON "patient_medications"("medication_id");

-- Pharmacy
CREATE TABLE "pharmacies" (
    "id" TEXT NOT NULL,
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "address1" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pharmacies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pharmacies_external_id_key" ON "pharmacies"("external_id");
CREATE INDEX "pharmacies_state_postal_code_idx" ON "pharmacies"("state", "postal_code");

-- PharmacyNetworkEligibility
CREATE TABLE "pharmacy_network_eligibility" (
    "id" TEXT NOT NULL,
    "pharmacy_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "price_type" "PriceType" NOT NULL,
    "active_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active_to" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pharmacy_network_eligibility_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pharmacy_network_eligibility_pharmacy_id_organization_id_pr_key"
    ON "pharmacy_network_eligibility"("pharmacy_id", "organization_id", "price_type");
CREATE INDEX "pharmacy_network_eligibility_organization_id_idx"
    ON "pharmacy_network_eligibility"("organization_id");

-- PricingQuote
CREATE TABLE "pricing_quotes" (
    "id" TEXT NOT NULL,
    "rxcui" TEXT NOT NULL,
    "pharmacy_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "price_type" "PriceType" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source_provider" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    CONSTRAINT "pricing_quotes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pricing_quotes_rxcui_pharmacy_id_idx" ON "pricing_quotes"("rxcui", "pharmacy_id");
CREATE INDEX "pricing_quotes_organization_id_idx" ON "pricing_quotes"("organization_id");

-- RefreshToken
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "device_label" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by_id" TEXT,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- AuditLog
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_role" "Role",
    "organization_id" TEXT,
    "parent_organization_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_log_actor_user_id_createdAt_idx" ON "audit_log"("actor_user_id", "createdAt");
CREATE INDEX "audit_log_organization_id_createdAt_idx" ON "audit_log"("organization_id", "createdAt");
CREATE INDEX "audit_log_action_createdAt_idx" ON "audit_log"("action", "createdAt");

-- ── Foreign keys ──────────────────────────────────────────────────
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parent_organization_id_fkey"
    FOREIGN KEY ("parent_organization_id") REFERENCES "parent_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "users" ADD CONSTRAINT "users_parent_organization_id_fkey"
    FOREIGN KEY ("parent_organization_id") REFERENCES "parent_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_preferred_pharmacy_id_fkey"
    FOREIGN KEY ("preferred_pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "drug_code_mappings" ADD CONSTRAINT "drug_code_mappings_medication_id_fkey"
    FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "patient_medications" ADD CONSTRAINT "patient_medications_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_medications" ADD CONSTRAINT "patient_medications_medication_id_fkey"
    FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pharmacy_network_eligibility" ADD CONSTRAINT "pharmacy_network_eligibility_pharmacy_id_fkey"
    FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pharmacy_network_eligibility" ADD CONSTRAINT "pharmacy_network_eligibility_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Append-only audit log enforcement ─────────────────────────────
-- Defense-in-depth: even if an app-layer bug issues an UPDATE or DELETE
-- against audit_log, Postgres blocks it. Only superuser / migration
-- role can alter the table itself.
CREATE OR REPLACE FUNCTION audit_log_block_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only; % forbidden', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_block_update
BEFORE UPDATE ON "audit_log"
FOR EACH ROW EXECUTE FUNCTION audit_log_block_mutation();

CREATE TRIGGER audit_log_block_delete
BEFORE DELETE ON "audit_log"
FOR EACH ROW EXECUTE FUNCTION audit_log_block_mutation();
