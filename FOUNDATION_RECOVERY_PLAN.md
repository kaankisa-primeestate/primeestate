# PrimeEstate — Foundation Recovery & Hardening Plan

> Updated: 22.09.2026
> Verified main: `7c5f9218964ad5d1a669b8e568b7e56a55cd6a3e`

## Operating rules
- [x] Freeze feature development until foundation gates pass.
- [x] Never modify `kaankisa-primeestate/remax-CRM`.
- [x] Production database is never reset as a shortcut.
- [x] No unrelated feature work before release gates are green.

## Phase 0 — Inventory & freeze
- [x] Foundation inventory and recovery plan.
- [x] Migration/release parity identified as critical.
- [x] CURRENT_STATE baseline established.

## Phase 1 — Database / migration integrity
- [x] Migration inventory and schema parity.
- [x] Safe production migration path.
- [x] CI migration validation.
- [x] Runtime schema health checks.
- [x] Sales / Commission / Payment / Ledger / PaymentPlan / Installment parity.

## Phase 2 — Data model integrity
- [x] Tenant/office/team FK consistency.
- [x] Sale ↔ Offer ↔ Listing consistency.
- [x] Sale ↔ Payment ↔ Ledger consistency.
- [x] PaymentPlan / Installment uniqueness and currency/total invariants.
- [x] Sale status-transition invariants.
- [x] Financial immutability after settlement.
- [ ] Explicit deletion policies.

## Phase 3 — Authorization foundation
- [x] Central role capabilities.
- [x] Organization/office/team/ownership scopes.
- [x] Agent customer ownership isolation.
- [x] Team Leader scope.
- [x] Office/Admin visibility.
- [x] Cross-office / cross-organization isolation.
- [x] Shared office listing visibility.
- [x] VIEWER/AUDITOR write denial.

## Phase 4 — API contract & error handling
- [x] Shared API response helpers.
- [x] Critical authentication/forbidden/validation/not-found normalization.
- [ ] Full success/error envelope standardization.
- [ ] Remaining conflict/database error normalization.
- [ ] Remaining client response assumptions.
- [ ] Broad API contract suite.

> Kalan Phase 4 hardening bilinçli olarak release gate sonrasına bırakılmıştır.

## Phase 5 — Runtime & route protection
- [x] Central page authentication guard.
- [x] Role-aware route protection.
- [x] Better Auth session behavior.
- [x] Unauthorized → /login.
- [x] Authenticated but unauthorized → /forbidden.
- [x] Production route manifest verification.
- [x] Web Quality green on merged main.
- [x] Production Auth Smoke green on merged main.

## Phase 6 — Test foundation
- [x] Node test runner + `npm test`.
- [x] Web Quality test step.
- [x] Authorization matrix tests.
- [x] Database-backed tenant/ownership tests.
- [x] API route integration tests.
- [x] Financial invariant tests.
- [x] Dedicated Critical Tests workflow.

## Phase 7 — Critical E2E business chain
- [x] Customer → Demand → Listing → Matching → Showing → Offer.
- [x] Accepted Offer → Sale.
- [x] Commission.
- [x] Payment → Ledger.
- [x] Payment Plan → Installments.
- [x] Dashboard reflection.
- [x] Finance reflection.

**Status:** Phase 7 complete and merged. Public repository sonrasında CI verification yeniden yeşil hale gelmiştir.

## Phase 8 — Codebase cleanup & documentation
- [x] Remove obsolete legacy matching engine.
- [x] Remove unused legacy Matching type.
- [x] Close obsolete PR #79.
- [x] Reconcile CURRENT_STATE.md.
- [x] Document release/migration procedure.
- [x] Document authorization matrix.
- [x] Document business status transitions.
- [x] Update foundation audit with completed remediation.
- [ ] Remove stale/dead branches after explicit branch cleanup.
- [ ] Final release-gate checklist.

## Phase 9 — Release gate
- [x] Main Web Quality green on `7c5f921...`.
- [x] Production Auth Smoke green on `7c5f921...`.
- [x] Critical E2E green after repository visibility change.
- [x] Foundation State Validation green.
- [ ] Explicit production migration-status validation for the final release commit when migration files change.
- [ ] Runtime `/api/health` verification recorded for the final release commit.
- [ ] Dashboard/Finance production no-500 verification recorded for the final release commit.
- [ ] Final CURRENT_STATE reconciliation after all Phase 8 documentation merges.
- [ ] Declare foundation ready for new feature development.

## Phase 8 operating note

Repository visibility is now public so GitHub-hosted Actions can run without the private-repository billing constraint that previously caused zero-step runner failures.

No application workaround was introduced for that CI infrastructure issue.
