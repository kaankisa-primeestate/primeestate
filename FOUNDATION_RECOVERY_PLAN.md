# PrimeEstate — Foundation Recovery & Hardening Plan

> Master checklist for rebuilding the technical foundation before adding new product features.
> Updated: 21.09.2026
> Base main: bbde12a3891a509a8aea15446b0f2410158915a7

## Operating rules

- [x] Freeze feature development until foundation gates pass.
- [x] Never modify kaankisa-primeestate/remax-CRM.
- [x] One phase at a time; no phase is skipped.
- [x] Phase 0 completed through implementation -> automated validation review -> PR -> merge -> main verification -> state update.\n- [x] Phase 1 completed with implementation -> automated validation -> PR -> green CI -> merge -> production migration -> runtime smoke -> state reconciliation.
- [ ] Every subsequent phase must have: implementation -> automated validation -> PR -> green CI -> merge -> main verification -> state update.
- [ ] Production database is never reset as a shortcut.
- [ ] No new feature work until all P0-P8 gates are green.

## Phase 0 — Inventory & freeze
- [x] Audit current main, migrations, schema, API patterns, auth/authorization, tests, CI/CD, and UI symptoms.
- [x] Record the /api/sales 500 as a runtime symptom, not a frontend root cause.
- [x] Identify migration/release parity as a critical risk.
- [x] Create this master checklist.
- [x] Verify current main workflow state after foundation merges.
- [x] Update CURRENT_STATE.md to the foundation recovery baseline.

## Phase 1 — Database / migration integrity
Goal: code schema, migration history, and deployed database are deterministically aligned.
- [x] Inventory every migration in order.
- [x] Verify schema.prisma matches the final migration state.
- [x] Verify migration history has no drift, gaps, duplicate assumptions, or destructive shortcuts.
- [x] Establish a single safe production migration path.
- [x] Add CI validation that migration state is deployable.
- [x] Add runtime/schema health check without exposing secrets.
- [x] Resolve the /api/sales 500 at its database/runtime root.
- [x] Verify Sales, Commission, Payment, Ledger, PaymentPlan, Installment schema parity.

## Phase 2 — Data model integrity
Goal: invalid business relationships become difficult or impossible to persist.
- [ ] Review tenant/office/team foreign-key consistency.
- [x] Harden Sale ↔ Offer ↔ Listing consistency (accepted-offer validation, one Sale per Listing, atomic listing reservation).
- [x] Harden Sale ↔ Payment ↔ Ledger consistency (paid-total calculation corrected; settlement commission changes locked).
- [x] Remove or constrain redundant PaymentInstallment.saleId relationship (derive through PaymentPlan; migration blocks inconsistent legacy rows).
- [ ] Define deletion policies explicitly.
- [x] Define status-transition invariants for Sale.
- [x] Prevent completed/cancelled sale and listing states from becoming inconsistent.
- [x] Define immutable financial facts after settlement where required.

## Phase 3 — Authorization foundation
Goal: one centralized policy model used by every protected API.
- [ ] Centralize role capabilities.
- [ ] Centralize organization/office/team/ownership scope.
- [ ] Define read/create/update/delete/manage permissions.
- [ ] Explicitly restrict VIEWER and AUDITOR write operations.
- [ ] Test Agent isolation.
- [ ] Test Team Leader scope.
- [ ] Test Office/Admin scope.
- [ ] Test cross-organization isolation.
- [ ] Test shared office listing visibility.

## Phase 4 — API contract & error handling
Goal: every API returns predictable JSON and consistent status codes.
- [ ] Create shared API response helpers.
- [ ] Standardize success/error envelopes.
- [ ] Standardize validation, auth, not-found, conflict, and database errors.
- [ ] Replace unsafe direct response.json() assumptions in client code.
- [ ] Preserve useful endpoint/status diagnostics.
- [ ] Add API contract tests for critical routes.

## Phase 5 — Runtime & route protection
Goal: UI routes and API routes have deterministic authentication behavior.
- [ ] Add centralized page/route authentication guard.
- [ ] Add role-aware route protection.
- [ ] Verify Better Auth session behavior.
- [ ] Verify unauthenticated redirect behavior.
- [ ] Verify authenticated-but-unauthorized behavior.
- [ ] Verify production route manifest checks remain green.

## Phase 6 — Test foundation
Goal: regressions fail CI before merge.
- [ ] Add unit tests for core business rules.
- [ ] Add integration tests for critical API routes.
- [ ] Add authorization matrix tests.
- [ ] Add tenant isolation tests.
- [ ] Add database/business invariant tests.
- [ ] Add migration validation to CI.
- [ ] Make critical tests required before merge.

## Phase 7 — Critical E2E business chain
Goal: prove the real CRM workflow end to end.
- [ ] Create customer.
- [ ] Create demand.
- [ ] Create listing.
- [ ] Match demand to listing.
- [ ] Schedule showing.
- [ ] Create offer.
- [ ] Convert accepted offer to sale.
- [ ] Calculate commission.
- [ ] Record payment.
- [ ] Create/update ledger.
- [ ] Create payment plan/installments.
- [ ] Verify dashboard reflects the chain.
- [ ] Verify Finance reflects the chain.

## Phase 8 — Codebase cleanup & documentation
Goal: one source of truth and no duplicate business engines.
- [ ] Consolidate/retire duplicate matching engines.
- [ ] Remove stale/dead branches and obsolete PRs after confirming their changes are superseded.
- [ ] Update CURRENT_STATE.md.
- [ ] Update foundation audit with completed remediation.
- [ ] Document release/migration procedure.
- [ ] Document authorization matrix.
- [ ] Document business status transitions.

## Phase 9 — Release gate
Goal: foundation is formally accepted before new feature work.
- [ ] Main CI green.
- [ ] Migration validation green.
- [ ] Auth smoke green.
- [ ] Authorization matrix green.
- [ ] Critical E2E green.
- [ ] Runtime health green.
- [ ] Production dashboard no API 500s.
- [ ] Finance no API 500s.
- [ ] CURRENT_STATE.md reconciled with actual main.
- [ ] Foundation declared ready for new feature development.

## Next action
Phase 2 is active. The current branch hardens Sale/Listing/Offer and PaymentPlan/Installment integrity. After CI, review the migration and runtime behavior before merge. Do not start feature development in parallel.
