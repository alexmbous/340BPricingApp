# Architecture — ApexCare 340B Pricing Platform

See `../README.md` for the developer overview. This doc captures the design decisions committed to in Phase 1 and implemented in Phase 2. Update it as an ADR trail: new decisions append, old decisions don't get silently rewritten.

## Key decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Monorepo (pnpm + Turborepo) | Shared types eliminate contract drift between mobile and API. |
| 2 | Row-level multi-tenancy with `organization_id` | Thousands of doctor offices make schema-per-tenant operationally painful. |
| 3 | Two explicit hierarchy levels (Parent → Org) | Recursive hierarchy adds complexity we don't need for the doctor-office model. |
| 4 | Self-hosted JWT + rotating refresh | Federated identity isn't the hard problem in v1. SSO is v1.3. |
| 5 | HS256 now, RS256 when a second verifier exists | Operational simplicity until it matters. |
| 6 | argon2id for passwords | OWASP current recommendation. |
| 7 | Provider adapter layer (4 interfaces, mock v1) | No free-and-authoritative 340B / pharmacy-directory / pricing API exists. |
| 8 | 340B guardrail enforced in `PricingService.compare`, not at the provider boundary | We can't trust a provider for compliance-sensitive labeling. |
| 9 | RFC 7807 problem details everywhere | Standard + easy to consume from the typed `ApiError` on mobile. |
| 10 | Append-only audit via Postgres triggers | Defense-in-depth: even a buggy deploy can't rewrite history. |
| 11 | Expo managed workflow | No native modules required for v1; EAS covers both stores cleanly. |

## Known risks and when they bite

- **Provider swap risk**: real pricing vendors may return denormalized data that doesn't map 1:1 to our `PricingQuoteResult`. Plan to extend the adapter contract additively, not break it.
- **Pharmacy directory drift**: mock pharmacies are seeded at fixed coordinates. Real NCPDP/vendor data will have thousands of rows — revisit indexing and `$2` the `findNearby` implementation to use PostGIS or a geohash if perf becomes an issue.
- **Audit log cardinality**: every pricing lookup writes a row. For a busy org, that's millions of rows per year. Plan a retention/archive job before a prod rollout.
- **340B eligibility is an assertion**: the doctor office tells us a patient is eligible. The platform does not verify HRSA's patient-definition rules. The buyer contract must make this responsibility explicit.
