# ApexCare 340B Pricing Platform

Multi-tenant B2B SaaS where doctor offices give their patients access to a medication pricing comparison app. Mobile (Expo) + API (NestJS) + Postgres/Prisma, designed with a typed adapter layer so real pricing / pharmacy / drug-catalog vendors can be plugged in later without product-code changes.

Phase 2 (this scaffold) ships production-minded foundations: auth, rotating refresh tokens, strict tenant scoping, append-only audit logging, RFC 7807 error responses, mock providers with realistic contracts, seed data, Docker, and CI.

Phase 3 will add the visible user flows: polished login, medication search, pharmacy comparison, admin create-patient / assign-medication, audit log viewer.

---

## Stack

| Layer | Tech |
|---|---|
| Mobile | Expo SDK 51 + expo-router, React Native 0.74, TanStack Query, Zustand |
| API | NestJS 10, REST (URI versioning `/v1`), class-validator, Zod at the edges |
| DB | PostgreSQL 16 + Prisma 5 |
| Auth | JWT (HS256) access + opaque rotating refresh tokens, argon2id passwords |
| Monorepo | pnpm workspaces + Turborepo |
| CI | GitHub Actions — lint/typecheck/tests, Docker build, optional ECS deploy |
| Mobile distribution | EAS Build → TestFlight / Play Internal (dev / staging / production profiles) |

---

## Repo layout

```
apps/
  api/        NestJS service, Prisma schema, migrations, seed, Dockerfile
  mobile/     Expo app, design system, auth-gated routes
packages/
  shared-types/         Role/enum/DTO/Zod schemas shared by API and mobile
  providers-contracts/  DrugCatalog / PharmacyDirectory / Pricing / Eligibility interfaces
  api-client/           Typed fetch client consumed by the mobile app
```

Everything that crosses the wire (DTOs, enums, problem details, API URLs) is defined in `packages/shared-types` and re-exported through `packages/api-client`. That's how we keep contract drift impossible between the two tiers.

---

## Prerequisites

- Node 20.11.0 (use `nvm use` — `.nvmrc` is committed)
- pnpm 9.12+ (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- Docker Desktop (for Postgres)
- (iOS only) Xcode + iOS Simulator
- (Android only) Android Studio + an emulator
- (Optional) Expo Go on your device for fast iteration

---

## First run — local dev

```bash
# 1) Install deps at the workspace root
pnpm install

# 2) Start Postgres
cp .env.example .env
pnpm db:up

# 3) Configure the API
cp apps/api/.env.example apps/api/.env
# The example .env has dev-safe defaults that match docker-compose.yml.

# 4) Migrate + seed
pnpm --filter @apexcare/api prisma generate
pnpm --filter @apexcare/api prisma migrate deploy
pnpm db:seed

# 5) Run the API (in one terminal)
pnpm api:dev
# → http://localhost:4000/v1/health

# 6) Run the mobile app (in another terminal)
cp apps/mobile/.env.example apps/mobile/.env
pnpm mobile:dev
# → Press `i` for iOS simulator, `a` for Android, or scan the QR with Expo Go
```

The seed prints working credentials for every role at the end — e.g.:

```
SUPER_ADMIN    : super@apexcare.test / Sup3rAdmin!Seed
PARENT_ADMIN   : parent@apexcare.test / ParentAdmin!Seed
ORG_ADMIN      : admin.apexcare-family-medicine@apexcare.test / OrgAdmin!Seed
PATIENT        : alex.martinez.apexcare-family-medicine@apexcare.test / Patient!Seed
```

On iOS simulator / Android emulator you may need to point the mobile app at your machine's LAN IP instead of `localhost`. Set `API_BASE_URL=http://192.168.x.x:4000` in `apps/mobile/.env`.

---

## Common scripts

```bash
pnpm dev            # starts API and mobile in parallel
pnpm api:dev        # NestJS with --watch
pnpm mobile:dev     # Expo dev server

pnpm lint           # eslint across all packages
pnpm typecheck      # tsc --noEmit
pnpm test           # unit tests (API)

pnpm db:up          # start Postgres
pnpm db:down        # stop Postgres
pnpm db:migrate     # prisma migrate dev (apps/api)
pnpm db:seed        # run apps/api/prisma/seed.ts
pnpm db:reset       # DESTRUCTIVE: drops + re-migrates + re-seeds
```

---

## API surface (selected)

All routes versioned under `/v1`. Errors are RFC 7807 `application/problem+json`.

```
POST   /v1/auth/login           { email, password } → tokens + user
POST   /v1/auth/refresh         { refreshToken }
POST   /v1/auth/logout
POST   /v1/auth/password        { currentPassword, newPassword }
GET    /v1/me

GET    /v1/medications/search?name=&strength=&form=&limit=
GET    /v1/medications/:id

GET    /v1/pharmacies/nearby?lat=&lng=&radiusMiles=&limit=
GET    /v1/pharmacies/:id

POST   /v1/pricing/compare      { rxcui, location:{lat,lng,radiusMiles}, patientId?, limit? }

GET    /v1/organizations
POST   /v1/parent-organizations/:parentId/organizations
POST   /v1/organizations/:organizationId/admins
GET    /v1/organizations/:organizationId/patients
POST   /v1/organizations/:organizationId/patients
GET    /v1/patients/:id
PATCH  /v1/patients/:id
GET    /v1/patients/:id/medications
POST   /v1/patients/:id/medications

GET    /v1/audit?...            admin only, scoped by role
GET    /v1/health               liveness
GET    /v1/health/ready         readiness (pings DB)
```

---

## Architecture highlights

### Tenancy — row-level, two-layer enforcement

Every tenant-scoped model carries `organization_id`. Two gates ensure no cross-tenant leakage:

1. **Primary — service layer.** Controllers pull `AuthActor` from `@CurrentUser()` and services call `buildOrganizationScope(actor)` to produce the `where` fragment for Prisma.
2. **Secondary — Prisma extension.** `PrismaService.scoped()` logs (dev) or throws (prod) if a scoped-model read is issued without any tenant filter. This is a safety net — primary enforcement is still the expectation.

Additionally, routes carry `@TenantScope({ organizationParam | patientParam | parentOrganizationParam })` so `TenantScopeGuard` verifies the route's target falls inside the actor's envelope before the handler runs.

### Auth — self-hosted JWT + rotating refresh

- Access tokens are short-lived JWTs (HS256). Rotating to RS256 is a config change; planned when a second verifying service comes online.
- Refresh tokens are 48-byte random strings, stored hashed (SHA-256) in `RefreshToken`.
- Rotation uses a `familyId`: if a revoked token is presented, the entire family is revoked (reuse detection).
- Passwords: argon2id with OWASP-baseline parameters.

### Audit — append-only, interceptor-based

- `@Audit({ action })` on controller methods writes a row via `AuditInterceptor`.
- Writes are best-effort — never break the user's request.
- `audit_log` has Postgres triggers blocking UPDATE/DELETE. Even a bad app deploy can't rewrite history.
- Sanitizer strips common PHI/secret keys from metadata (`email`, `dateOfBirth`, `password`, `lat`, `lng`, etc.).

### Providers — typed adapters, mock v1

`packages/providers-contracts` defines four interfaces. `apps/api/src/providers/**` ships mock implementations. Real vendor integrations plug into the same interfaces, no product-code changes required.

The **340B guardrail** — critical and non-obvious — lives in `PricingService.compare`: a `CONTRACT_340B` quote is displayed to the patient only when (a) their org is a covered entity, (b) the pharmacy has an active `PharmacyNetworkEligibility` for `(org, pharmacy, CONTRACT_340B)`, and (c) the org has asserted the patient's eligibility. Otherwise the 340B quote is suppressed entirely — we do not mislabel.

---

## Deployment (AWS)

### API — Fargate + RDS

- Image: `apps/api/Dockerfile` (multi-stage, non-root, distroless-ish Alpine runtime).
- Target: ECS Fargate behind an ALB. Healthcheck hits `/v1/health/ready`.
- Database: RDS Postgres 16. Encrypt at rest, SSL in transit. Enable PITR.
- Migrations: prefer a separate one-shot task (`RUN_MIGRATIONS=true` + `node_modules/prisma/build/index.js migrate deploy`), not baked into every container start.
- Secrets: AWS Secrets Manager. `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL` via task-definition secrets.
- Logs: `awslogs` driver → CloudWatch Logs. pino JSON output makes queries straightforward.
- CI: `.github/workflows/deploy-api.yml` pushes to ECR and triggers `ecs update-service --force-new-deployment`. Uses OIDC (no long-lived AWS keys in Actions).

### Mobile — EAS + TestFlight / Play Internal

- `apps/mobile/eas.json` defines three profiles: `development` (simulator-friendly, `apexcare.dev` scheme), `staging` (internal distribution, `apexcare.staging`), `production` (`apexcare`).
- `app.config.ts` switches bundle id, scheme, display name, and API base URL on `APP_ENV`.
- Local dev with Expo Go still works — open the project on a phone with `pnpm mobile:dev` and scan the QR.
- Store submission handled via `eas submit` after filling in the `REPLACE_ME` placeholders in `eas.json`.

---

## HIPAA posture

This scaffold implements **HIPAA-aware patterns**, not a HIPAA compliance certification:

- Encryption in transit (TLS) and at rest (RDS + SecureStore on device).
- Append-only audit log with trigger-level enforcement.
- Sanitizers prevent PHI in logs and audit metadata.
- Tokens stored in platform keystore on device (never AsyncStorage).
- No PHI in server logs (pino redact config).
- Strict tenant isolation verified at multiple layers.

A production launch still requires: a signed BAA with the hosting provider and any subprocessors, a formal risk assessment, HIPAA policies, employee training, and breach-notification processes. Those are organizational, not code.

---

## What's intentionally NOT included yet

- MFA for admin accounts (schema ready, enrollment flow is v1.1).
- Real RxNav / vendor pricing / NCPDP directory integrations — adapters are in place, implementations are mock.
- SSO (SAML/OIDC) — v1.3.
- Push notifications.
- Offline support on the mobile client beyond what TanStack Query gives us.
- Contract-pharmacy admin UI (data model is there; UI is v1.1).

---

## License

Proprietary. All rights reserved.
