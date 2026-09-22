# PrimeEstate — Foundation Recovery & Hardening Plan

> Master checklist for rebuilding the technical foundation before adding new product features.
> Updated: 22.09.2026
> Base main: 98c4ab152b8b7b5107b43d99f48f289eb705ff17

## Operating rules
- [x] Freeze feature development until foundation gates pass.
- [x] Never modify kaankisa-primeestate/remax-CRM.
- [x] Phase 0 completed.
- [x] Phase 1 completed.
- [x] Phase 2 completed.
- [x] Phase 3 completed.
- [x] Phase 4 critical response/auth foundation completed.
- [x] Initial Phase 6 test foundation slice completed.
- [ ] Production database is never reset as a shortcut.
- [x] No new feature work until release gates are green.

## Phase 0 — Inventory & freeze
- [x] Audit current main, migrations, schema, API patterns, auth/authorization, tests, CI/CD, and UI symptoms.
- [x] Record the /api/sales 500 as a runtime symptom, not a frontend root cause.
- [x] Identify migration/release parity as a critical risk.
- [x] Create this master checklist.
- [x] Verify current main workflow state after foundation merges.
- [x] Update CURRENT_STATE.md to the foundation recovery baseline.

## Phase 1 — Database / migration integrity
- [x] Inventory every migration in order.
- [x] Verify schema.prisma matches the final migration state.
- [x] Verify migration history has no drift, gaps, duplicate assumptions, or destructive shortcuts.
- [x] Establish a single safe production migration path.
- [x] Add CI validation that migration state is deployable.
- [x] Add runtime/schema health check without exposing secrets.
- [x] Resolve the /api/sales 500 at its database/runtime root.
- [x] Verify Sales, Commission, Payment, Ledger, PaymentPlan, Installment schema parity.

## Phase 2 — Data model integrity
- [x] Harden tenant/office/team foreign-key consistency.
- [x] Harden Sale ↔ Offer ↔ Listing consistency.
- [x] Harden Sale ↔ Payment ↔ Ledger consistency.
- [x] Remove/constrain redundant PaymentInstallment.saleId relationship.
- [ ] Define deletion policies explicitly.
- [x] Define status-transition invariants for Sale.
- [x] Prevent completed/cancelled sale and listing states from becoming inconsistent.
- [x] Define immutable financial facts after settlement where required.

## Phase 3 — Authorization foundation
- [x] Centralize role capabilities.
- [x] Centralize organization/office/team/ownership scope.
- [x] Define read/create/update/delete/manage permissions.
- [x] Explicitly restrict VIEWER and AUDITOR write operations.
- [x] Initial authorization matrix tests added in Phase 6 test foundation.
- [x] Agent customer ownership isolation integration coverage.
- [x] Team Leader scope integration tests for customer routes.
- [x] Full Office/Admin scope integration tests.
- [x] Cross-office and cross-organization customer/listing isolation coverage.
- [x] Shared office listing visibility integration coverage.

## Phase 4 — API contract & error handling
- [x] Create shared API response helpers.
- [x] Normalize critical authentication/forbidden/validation/not-found responses.
- [ ] Standardize all success/error envelopes.
- [ ] Standardize remaining conflict and database errors.
- [ ] Replace remaining unsafe direct response.json() assumptions in client code.
- [ ] Preserve useful endpoint/status diagnostics.
- [ ] Broad API contract test suite.
- Note: remaining Phase 4 work is intentionally deferred.

## Phase 5 — Runtime & route protection — COMPLETE
- [x] Add centralized page/route authentication guard.
- [x] Add role-aware route protection.
- [x] Verify Better Auth session behavior.
- [x] Verify unauthenticated redirect behavior.
- [x] Verify authenticated-but-unauthorized behavior.
- [x] Verify production route manifest checks remain green.
- [x] Web Quality #456 green on merged main.
- [x] Production Auth Smoke #48 green on merged main.

## Phase 6 — Test foundation — COMPLETE
### Completed
- [x] Add Node built-in test runner and `npm test`.
- [x] Run tests in Web Quality CI.
- [x] Add authorization matrix/unit coverage for core authz policy.
- [x] Add database-backed integration coverage for agent customer ownership isolation.
- [x] Add cross-office and cross-organization isolation coverage.
- [x] Add shared office listing visibility coverage.
- [x] Add Sale ↔ accepted Offer ↔ Listing uniqueness invariant coverage.
- [x] Deploy Prisma migrations in the CI test database before integration tests.

### Remaining active scope
- [x] Add integration tests for critical API routes.
- [x] Add initial authorization matrix integration tests across actual route handlers.
- [x] Add Team Leader scope integration tests for customer routes.
- [x] Add Office/Admin scope integration tests.
- [x] Expand database/business invariant tests for Payment ↔ Ledger and PaymentPlan ↔ Installment.
- [x] Add a dedicated Critical Tests workflow/check. Branch protection enforcement remains a repository-settings concern and is not verified as enabled.

## Phase 7 — Critical E2E business chain
- [x] Create customer.
- [x] Create demand.
- [x] Create listing.
- [x] Match demand to listing.
- [x] Schedule showing.
- [x] Create offer.
- [x] Convert accepted offer to sale.
- [x] Calculate commission.
- [x] Record payment.
- [x] Create/update ledger.
- [x] Create payment plan/installments.
- [x] Verify dashboard reflects the chain.
- [x] Verify Finance reflects the chain.

**Status:** Core HTTP business chain is merged via PR #80. Dashboard/Finance live-data verification and finance summary hardening are merged via PR #82.

## Phase 8 — Codebase cleanup & documentation/ — ACTIVE
- [x] Consolidate/retire duplicate matching engines: legacy `web/src/core/matching.ts` and unused `web/src/types/Matching.ts` removed after repository-wide reference audit.
- [ ] Remove stale/dead branches and obsolete PRs after confirming their changes are superseded.
- [x] Update CURRENT_STATE.md.
- [ ] Update foundation audit with completed remediation.
- [ ] Document release/migration procedure.
- [ ] Document authorization matrix.
- [ ] Document business status transitions.

## Phase 9 — Release gate
- [ ] Main CI green on the final release commit.
- [ ] Migration validation green.
- [ ] Auth smoke green against the deployed main commit.
- [ ] Authorization matrix green.
- [ ] Critical E2E green.
- [ ] Runtime health green.
- [ ] Production dashboard no API 500s.
- [ ] Finance no API 500s.
- [ ] CURRENT_STATE.md reconciled with actual main.
- [ ] Foundation declared ready for new product feature development.

## Current blocking note
PR #81 was created from the old `84ac069...` base and is now stale/diverged because main also contains the Codex handoff commits. Its net code change is DashboardLive. It must not be merged as-is. Recreate the change on a clean current-main branch and validate it.

## Next action
Create/validate a clean current-main Dashboard/Finance branch. Do not merge until CI is green and the live financial chain is verified. Then complete Phase 8 and Phase 9. Do not start unrelated product feature development in parallel.
