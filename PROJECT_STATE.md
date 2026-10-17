# PrimeEstate — PROJECT STATE

> **Canonical project handoff and operating memory.**
> This is the standard starting point for every future PrimeEstate development session.
>
> **Binding AI product guide:** `AI_PRODUCT_ROADMAP.md`. Read it before AI-related work and use it as the product decision checklist for all relevant development.
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

No active product PR is assumed. Verify open PRs and CI at the start of each session; the next task is to inspect the next concrete user-visible gap in the core consultant workflow.

### Current main commit

`576b2ebfd51918799a11fac1dcd8d81701966bcf` — PR #186 merged. Main Web Quality and Production Auth HTTP Smoke passed; Render is confirmed running this exact commit.

### Branch state

- PR #161 — merged: canonicalizes equivalent learned property features.
- PR #162 — merged: prevents substring-only false positives in property-feature matching.
- PR #163 — merged: null, undefined, and blank budget/area criteria remain unspecified rather than becoming zero.
- PR #165 — merged: successful demand edits return to the edited customer detail page.
- PR #166 — merged: adds a visible **Düzenle** action beside **Eşleştir** for active demands on customer detail.
- PR #168 — merged: demand-edit return/cancel navigation targets the correct customer detail route.
- PR #169 — merged: safe API response parsing in customer detail, demand edit, and showing-result save flow; no schema/migration/auth-scope change.
- PR #171 — merged: customer detail returns active demands only; API integration regression test confirms inactive demands do not appear in the “Aktif talepler” workflow. No schema/migration/auth-scope change.
- PR #175 — merged: reconciles project handoff documents; no runtime/schema/migration/auth-scope change.
- PR #176 — merged: adds direct next-step actions when matching returns no results; UI-only, no schema/migration/auth-scope change.
- PR #177 — merged: shared safe API response parsing in Calls, Relationships, and Calendar; no API/schema/migration/auth-scope change.
- PR #178 — merged: simplified live-data dashboard workspace.
- PR #179 — merged: preserves Prime Brief customer selection by stable customer ID and handles empty/malformed API responses safely.
- PR #180 — merged: shared safe API response parsing in new Showing and Offer forms; no schema/migration/auth-scope or business-rule changes.
- PR #181 — merged: safe API response handling in the sales workflow; no schema/migration/auth-scope or business-rule changes.
- PR #182 — merged: safe API response handling and payload-shape validation in global search; prevents stale results from being displayed for a new/failed query; no schema/migration/auth-scope or search-rule changes.
- Verify live open PRs and branches at each session start.

### Latest main verification — 2026-10-17

- GitHub `main` points to `576b2ebfd51918799a11fac1dcd8d81701966bcf` (PR #186 merge).
- Main Web Quality — [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/39013309315) on `576b2ebfd51918799a11fac1dcd8d81701966bcf`.
- Production Auth HTTP Smoke — [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/39013309352) on `576b2ebfd51918799a11fac1dcd8d81701966bcf`. Render's `/api/deployment-check` confirmed the live commit exactly matches `576b2ebfd51918799a11fac1dcd8d81701966bcf` at 2026-10-17 07:23:41 UTC.
- Production smoke verified sign-in, session, database health, authenticated customers, dashboard and finance pages, listings, sales, and payments all returned successful responses without HTTP 500s.
- PR #182 merged: global search safely parses malformed/empty API responses, validates query/customer/listing payload shapes, and avoids displaying stale results for a pending or failed query.
- PR #184 merged: showing/offer links preserve matching customer/demand context, and forms use deterministic in-app return routes rather than browser-history navigation. No API, database, migration, authorization, or business-rule changes.
- PR #181 also merged before PR #182: safe API response handling in the sales workflow.
- PR #186 merged: malformed matching payloads are now reported as a response error rather than silently rendered as zero matches.
- Current release gate is green; no schema/migration/auth-scope changes were included in PR #186.
- Dependency install logs reported 16 npm audit findings (15 high, 1 critical). This remains separate technical debt; do not apply blind or breaking upgrades.

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
- Financial APIs and dashboard must use live data.
- Never replace live data with static demo values.
- Accepted offer → sale → commission → one-time payment/ledger collection is the validated financial chain.
- Consultant fees are tracked separately from sales commissions.

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
- Prime learning now removes opposite sentiment for a feature when clear feedback reverses; mixed-sentiment feedback is treated as neutral (PR #159). Monitor for future parsing/attribute-level edge cases.

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
- CURRENT_TASK: Inspect the next concrete user-visible gap in the customer → demand → matching → showing → offer workflow; verify open PRs, main CI, and Render runtime before coding.
- ACTIVE_BRANCH: `main` at last verified snapshot; confirm live branch/PR state at session start.
- BASE_MAIN_COMMIT: 576b2ebfd51918799a11fac1dcd8d81701966bcf
- ACTIVE_PR: No active product PR is carried forward in this snapshot; verify live open PRs before starting new work.
- LAST_GREEN_CHECKS: Main Web Quality run 39013309315 and Production Auth HTTP Smoke run 39013309352 passed on `576b2ebfd51918799a11fac1dcd8d81701966bcf`; Render live commit matches exactly.
- PRODUCTION_MIGRATION: none required for PR #186; no schema/migration changes.
- NEXT_STEP: Inspect the next concrete user-visible gap in the core consultant workflow, then make one narrow, testable change through branch → PR → green checks → merge → production SHA verification.
- BLOCKERS: No release blocker from PR #186. npm audit findings (15 high, 1 critical) need a separate risk review; do not run blind/force upgrades.
- LAST_UPDATED_UTC: 2026-10-17

## 16. Latest verified product change — PR #174

- PR #174 merged: `https://github.com/kaankisa-primeestate/primeestate/pull/174`.
- New-demand form “Müşteri detayına dön” and “Vazgeç” navigate directly to the owning customer detail instead of relying on browser history.
- New-demand creation uses the shared `readApiPayload` helper for safe Turkish errors on empty/malformed API responses.
- No database/schema/migration or authorization/data-scope changes.
- Main commit: `c88a0665a99d51221518f302e4cea7e279e42528`.
- PR Web Quality [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38740404917); Critical Tests [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38740405598).
- Main Web Quality [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38742436619); Production Auth HTTP Smoke [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38742436560).


## 17. Latest verified product change — PR #184

- PR #184 merged: `https://github.com/kaankisa-primeestate/primeestate/pull/184`.
- Matching page showing/offer links preserve `/matching?customerId=...&demandId=...` context using `returnTo`.
- Showing and offer forms navigate deterministically back to a validated matching route, customer detail, or sales workspace; no reliance on `router.back()`.
- Main commit: `770a5e1a72cf040e0db173943084df057869a28e`.
- Main Web Quality [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/39011471048); Production Auth HTTP Smoke [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/39011471124).
- Render `/api/deployment-check` confirmed live commit `770a5e1a72cf040e0db173943084df057869a28e` exactly; production auth/session/customer-authorization smoke passed.
- No API, database, migration, authorization, or business-rule changes.


## 18. Latest verified product change — PR #186

- PR #186 merged: `https://github.com/kaankisa-primeestate/primeestate/pull/186`.
- Matching now validates that successful `/api/matching` responses contain a `matches` array in both automatic matching and manual refresh. A malformed payload is surfaced as an explicit Turkish error rather than being misrepresented as no matching portfolios.
- Main commit: `576b2ebfd51918799a11fac1dcd8d81701966bcf`.
- Main Web Quality [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/39013309315); Critical Tests passed on the PR branch; Production Auth HTTP Smoke [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/39013309352).
- Render `/api/deployment-check` confirmed live commit `576b2ebfd51918799a11fac1dcd8d81701966bcf` exactly; sign-in, session, database health, authenticated customer access, dashboard, finance, listing, sales, and payment checks passed without HTTP 500s.
- No API, database, migration, authorization, or matching-score/business-rule changes.
