# PrimeEstate — Foundation Recovery & Hardening Plan

> Updated: 22.09.2026
> Verified main: `d8b95168d7b2e0d7580795eb8cf989a52e86ed25`

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

## Phase 5 — Runtime & route protection — COMPLETE
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

**Status:** Phase 7 complete and merged. Dashboard/Finance live verification and finance summary hardening are also merged.

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
- [x] Final release-gate checklist.

## Phase 9 — Release gate
- [x] Main Web Quality green on `2aca0b1...`.
- [x] Production Auth Smoke green on `2aca0b1...`.
- [x] Critical E2E green after repository visibility change.
- [x] Foundation State Validation green on the current Phase 8 documentation branch after its assertion was reconciled.
- [x] Explicit production migration-status validation recorded for final release commit `2aca0b1...` (`Database schema is up to date!`).
- [x] Runtime `/api/health` verification recorded for final release commit `2aca0b1...` (`status=200`, `database=connected`).
- [x] Dashboard/Finance production no-500 verification recorded for final release commit `2aca0b1...`.
- [x] Final CURRENT_STATE reconciliation prepared against final main commit `2aca0b1...`.
- [x] Declare foundation ready for new feature development after this reconciliation is merged.

## Phase 8 / CI note

Repository visibility is now public. After this change, GitHub-hosted Actions runners started normally again; the prior zero-step runner failures disappeared. No application workaround was introduced for that infrastructure issue.

CI state changes must be diagnosed from actual job steps/logs before code changes are made.
