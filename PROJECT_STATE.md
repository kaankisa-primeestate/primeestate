# PrimeEstate — PROJECT STATE

> **Canonical project handoff and operating memory.**
> This is the standard starting point for every future PrimeEstate development session.
>
> **Shortcut:** When the user says **“PrimeEstate”**, first read this file, then verify the live GitHub state (main, active branch/PR, CI, and relevant code) before continuing.

## 1. PROJECT IDENTITY

- Product: **PrimeEstate**
- Type: Real-estate CRM / Office Operating System / SaaS
- Main repository: `kaankisa-primeestate/primeestate`
- **Canonical/live repository: `kaankisa-primeestate/primeestate`**
- Production: `https://primeestate-v9eo.onrender.com`
- Primary stack: Next.js + React + TypeScript + Prisma + PostgreSQL/Neon + Better Auth
- Architecture: multi-tenant, responsive, mobile-first, server-side authorization

## 2. NORTH STAR

PrimeEstate is the real-estate consultant's **second brain**.

Core loop:

**Remember → Think → Suggest → Act → Remember**

Real-estate loop:

**Talep → Eşleştir → Göster → Geri bildirim al → Hafızaya kaydet → Öğren → sonraki eşleşmeyi iyileştir**

The product should help the consultant build relationships while PrimeEstate remembers context, thinks about the next step, suggests useful actions, and learns from outcomes.

## 3. NON-NEGOTIABLE DATA / AUTHORIZATION RULES

### Tenant hierarchy

**Platform → Organization → Office → Users/Consultants → CRM records**

### Customer privacy

- Customer records are consultant-scoped/private.
- A consultant sees their own customers and records within their authorized scope.
- Managers see broader office/organization data according to role.
- Never weaken server-side authorization to make the UI work.

### Office portfolio

- **All consultants in the same office can see the entire office portfolio.**
- Portfolio visibility is office-scoped, not consultant-private.
- Ownership controls editing, assignment, and sensitive actions; it does not remove ordinary office-wide portfolio visibility.
- Matching, showing, and Prime recommendations use the same office-wide portfolio boundary.

## 4. CURRENT DEVELOPMENT STATE

### Current phase

**Phase 12 — Product Development / Core Workflow Experience**

### Current objective

Foundation hardening is closed for the current release gate. Product development now focuses on making the core consultant workflow fully useful in the UI: customer → demand → matching → showing → offer → sale → commission → collection, while preserving live data, business rules, and tenant authorization.

### Active branch

**none** — working directly from `main`.

### Current main commit

`5d5cbed0f1622e20c13e7d438e8c0f70e78d8b96`

### Branch state

No active development PR. Remaining open PRs are older foundation/legacy branches and are not the active continuation path.

### Latest main verification

- PrimeEstate Web Quality #1168 — **success**
- PrimeEstate Production Auth HTTP Smoke Test #252 — **success**

### Immediate next steps

1. Begin core product development from the consultant workflow, starting with the customer → demand → matching experience.
2. Keep every new feature connected to live APIs, authorization, and real workflow tests.
3. After each meaningful feature, verify GitHub CI before moving on.

## 5. RECENT COMPLETED WORK

Recent main milestones:

- PR #107 — platform office onboarding and approval
- PR #108 — consultant self-service onboarding
- PR #109 — visible login/session/logout UI
- PR #110 — consultant applications under Users & Team
- PR #111 — application route protection
- PR #112 — office-specific consultant invite link
- PR #113 — persistent consultant profile/company/commission plan
- PR #115 — broker editing of consultant profile/company/commission
- PR #116 — live consultant performance overview
- PR #117 — portfolio creation with consultant assignment
- PR #118 — property-type-specific listing fields
- PR #119 — Prime daily priority workspace
- PR #120 — explainable Prime recommendations
- PR #121 — improved Prime outcome capture
- PR #126 — practical photo upload and listing preview
- PR #127 — responsive mobile navigation shell

Latest mobile UX commits on main:

- Dashboard workspace polish
- Portfolio workspace polish
- Customer workspace polish
- Customer detail mobile polish
- Customer edit form mobile polish
- Sales Ops / İş Akışı mobile workspace polish (`3f5d9f4c61ea01b0950bf162e1d1b46be2a0e11c`)
- Finance workspace + Finance Dashboard mobile polish (`30308875bd54fbf8bb7526a7fe80db3252e38a82`)
- Calendar mobile workspace polish (`41b8d6bef04bc42353c54595edc03ebfbb0b84c6`)
- Calls mobile workspace polish (`cc131d6974da05a95908e1c400dc1b505a3caefe`)

## 6. PRIME BRAIN — CURRENT ARCHITECTURE

Important components:

- `web/src/core/prime-learning.ts`
  - showing-based learning
  - Prime learning storage
  - outcome-learning extension is the active task
- `web/src/core/demand-preference-learning.ts`
  - extracts budget, rooms, must-have and must-not-have signals from outcomes
- `web/src/core/matching-engine.ts`
  - reads `preferences.primeLearning`
  - applies learning adjustment to matching
- `web/src/app/api/prime/brief/route.ts`
  - aggregates customer context, learning, reasons, confidence and next action
- `web/src/app/api/prime/action/route.ts`
  - records Prime actions/outcomes
  - updates demand preferences
  - rematches active demands against office portfolio
- `web/src/components/PrimeBriefLive.tsx`
  - daily priorities
  - recommendation explanations
  - outcome capture
  - consultant actions
- `web/src/app/api/showings/route.ts`
  - existing showing-completion learning path

## 7. ONBOARDING MODEL

### Broker / Office

- Broker is the office owner/manager.
- Broker UI maps technically to `OFFICE_ADMIN`.
- Public office application → broker approval → Organization + Office + OFFICE_ADMIN account.

### Consultant

- Consultant can submit a self-service application.
- Application collects personal, company, commission-sharing and password information.
- Broker reviews and approves/rejects.
- Approval creates the consultant user and persistent:
  - `ConsultantProfile`
  - `ConsultantCompany`
  - `ConsultantCommissionPlan`
- Application remains as historical onboarding record.
- Commission plan is separate from sale commission snapshots.
- **REP / MAKSİMUM semantics are not defined yet; do not invent calculation rules.**

## 8. FINANCE / BUSINESS INVARIANTS

- Sale has unique `offerId` and `listingId`.
- Sale stores commission snapshots for historical correctness.
- PaymentPlan is unique per sale.
- PaymentInstallment is unique per plan + sequence.
- Financial APIs and dashboard must use live data.
- Never replace live data with static demo values.
- Accepted offer → sale → commission → payment/ledger → payment plan/installments is the validated business chain.

## 9. PRODUCTION / MIGRATION RULES

- Production service: `https://primeestate-v9eo.onrender.com`
- Production database migrations use the dedicated GitHub Actions migration workflow.
- **Never reset the production database blindly.**
- Never put secrets or database connection strings in source code.
- A successful explicit production migration run is authoritative for applying a migration; a separate stale/status-check failure must be investigated separately rather than “fixed” by destructive DB actions.
- Render UI is not assumed accessible from the development workflow; verify through GitHub smoke checks or user-provided Render evidence.

## 10. CI / RELEASE RULES

Required principle:

**Do not merge red.**

Before merge:

- Critical Tests green
- Web Quality green
- Relevant migration validation green
- Relevant auth/runtime smoke green
- No unresolved root-cause failure
- Main/branch state understood

After merge:

- Verify the merge reached main.
- Verify main CI.
- Verify production migration when schema changed.
- Verify runtime smoke when relevant.
- Update this file.

## 11. KNOWN TECHNICAL DEBT / LATER WORK

- broader API response/error contract hardening
- expanded API contract suite
- deletion policy — documented and HTTP policy coverage added
- remaining dashboard live-data edge cases
- finance route naming cleanup
- listing status filtering refinements
- auth matrix documentation refinements
- business transition documentation
- release/migration documentation
- stale branch / obsolete PR cleanup — open legacy PRs #1, #22, #30, #62, #65 closed as obsolete; legacy branches retained for history
- consultant application T.C. display should remain privacy-conscious; prefer masked/last-four display unless full value is genuinely required
- selected Prime customer should ideally be preserved by customer ID rather than list index across refresh
- old positive/negative Prime learning signals can persist if sentiment reverses; improve the learning model deliberately rather than via ad-hoc cleanup

## 12. DO NOT DO
- Do not reset production DB.
- Do not expose secrets.
- Do not weaken authorization.
- Do not make consultant customer data office-wide.
- Do not make portfolio visibility consultant-private.
- Do not add static fake data to make dashboards look alive.
- Do not merge red CI.
- Do not perform broad refactors without a concrete reason.
- Do not invent business semantics that the product has not defined.
- Do not treat a green-looking UI as proof that the underlying workflow works.

## 13. DECISION ORDER

1. Does it improve the Prime loop?
2. Does it help the consultant?
3. Does it create or improve useful live data?
4. Does it preserve tenant / office / ownership boundaries?
5. Can it be tested through the real workflow?

## 14. STANDARD HANDOFF PROTOCOL

**“PrimeEstate” is the canonical resume command.**

When a new development session begins with **“PrimeEstate”**:

1. Read `PROJECT_STATE.md`.
2. Check GitHub `main`.
3. Check active branches and open PRs.
4. Check CI for the relevant commit/PR.
5. Inspect the code around `CURRENT_TASK`.
6. Reconcile the document with the actual repository state.
7. Continue from the first incomplete step.
8. Do not ask the user to re-explain the project unless repository state is genuinely insufficient.
9. Before ending a work session, update `PROJECT_STATE.md` with the new snapshot.

### Current mobile navigation implementation

- Desktop sidebar is hidden below `md`.
- Mobile uses a dedicated header and fixed drawer.
- Drawer closes on navigation, backdrop click, close button, or Escape.
- Body scrolling is locked while the drawer is open.
- Mobile drawer content is independently scrollable.
- Role-based Users & Team links are preserved.
- No database or migration change was made.

### Important: this file is a snapshot, not a diary

We do **not** continuously append every small code change to this file.

- Git commits are the detailed technical history.
- Pull requests are the feature/change history.
- CI runs are the verification history.
- `PROJECT_STATE.md` is the **current handoff snapshot**: where we are now, what is active, what is blocked, and exactly what to do next.
- Therefore, tomorrow we do **not** need to reconstruct today's work from memory. We read this file, then verify the actual GitHub state and continue.
- At the end of a meaningful work session, this file is updated so its CURRENT_* fields describe the new reality.
- If a change is committed but not yet merged, the active branch/PR section records that explicitly.
- If a PR is merged, the snapshot moves to the new main commit and the next task.
- If work is abandoned, blocked, or rolled back, that is recorded as well.

This gives us **one current source of truth without duplicating Git's history**.

## 15. STATE UPDATE TEMPLATE

Keep these fields current:

- CURRENT_PHASE: Phase 12 — Product Development / Core Workflow Experience
- CURRENT_TASK: Start core consultant workflow development with customer → demand → matching UI continuity
- ACTIVE_BRANCH: main
- BASE_MAIN_COMMIT: 5d5cbed0f1622e20c13e7d438e8c0f70e78d8b96
- ACTIVE_PR: none
- LAST_GREEN_CHECKS: Web Quality #1168 ✅; Production Auth Smoke #252 ✅
- PRODUCTION_MIGRATION: No schema change; no migration required
- NEXT_STEP: Improve the customer → demand → matching experience with live data and explainable match results
- BLOCKERS: None
- LAST_UPDATED_UTC: 2026-10-02