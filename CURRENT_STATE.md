# PrimeEstate — CURRENT STATE

> **Canonical handoff:** `PROJECT_STATE.md`
>
> This file remains the compatibility/state-validation document. The canonical cross-session project memory is `PROJECT_STATE.md`. For a new development session, read `PROJECT_STATE.md` first, then verify GitHub `main`, open PRs, CI and relevant code.

## 1. Proje

PrimeEstate, gayrimenkule özel, AI destekli, uçtan uca entegre bir Office Operating System / SaaS platformudur.

**Ana prensip:** TEK VERİ, ÇOK FONKSİYON

- Ana geliştirme repo: `kaankisa-primeestate/primeestate`
- Tüm geliştirme PrimeEstate üzerinde yapılır.

## 2. Mimari

- Next.js + React + TypeScript
- Prisma + PostgreSQL/Neon
- Better Auth
- Multi-tenant
- Responsive / mobile-first
- Server-side authentication + authorization scope
- AI provider bağımsız mimari

## 3. Foundation Recovery

### Tamamlanan

- Phase 0 — Inventory & freeze
- Phase 1 — Database / migration integrity
- Phase 2 — Data model integrity
- Phase 3 — Authorization foundation
- Phase 4 — kritik response/auth foundation
- Phase 5 — Runtime & Route Protection
- Phase 6 — integration / authorization / financial invariant test foundation
- Phase 7 — critical HTTP E2E business chain
- Phase 7 — Dashboard / Finance live-data verification
- Phase 8 — duplicate matching engine cleanup

### Ertelenen teknik borç

- Phase 4'ün kalan geniş response/error contract hardening kapsamı
- Fazla geniş API contract suite
- Açık deletion policy çalışması
- Release gate sonrası ele alınacak ürün dışı hardening işleri

### Aktif phase

**Phase 12 — Product Development / Core Workflow Experience**

## 4. Doğrulanmış GitHub durumu

**Foundation final audit: CLOSED — 2026-10-08.**

Current verified main: `732b4f178af3c183ccb3c99e4b3c77b07bcf6acd` (PR #157 merge; verify latest main and post-merge CI at each session start).
- PR #154 merged: matching UI safely handles malformed/empty API responses.
- PR #156 merged: stale matching requests cannot overwrite newer selected-demand results.
- PR #157 merged: Relationship Workspace contact outcomes now use `/api/prime/action`, so Prime learning and active-demand rematching run through the existing authorized workflow.
- PR #157 pre-merge Web Quality #1311 and Critical Tests #192 passed. Post-merge Web Quality #1312 and Production Auth HTTP Smoke #365 were queued/in progress at documentation update time; do not mark them green until confirmed.

### Main / Release-gate baseline

Current main tip is the latest merge commit. The verified release-gate baseline is `2da8953f06304e6a2b6f049571a2df991b1e61e9`.

PR #90 established the release-gate documentation baseline. Production runtime verification remains tied to application commit `2aca0b13...`; PR #90 and the subsequent state-reconciliation commits did not change application runtime code or the database schema.

### Son önemli merge'ler

- PR #80 — Phase 7 critical E2E business chain — merged
- PR #82 — Dashboard / Finance live verification — merged
- PR #83 — Phase 7 state reconciliation — merged
- PR #84 — post-merge documentation reconciliation — merged
- PR #85 — final documentation reconciliation — merged
- PR #86 — obsolete legacy matching engine cleanup — merged
- PR #88 — production release-gate smoke hardening — merged

### Açık PR

Şu anda eski Phase 6 dokümantasyon PR #79 kapatılmıştır. PR #81 ve #82 dahil eski Phase 7 PR'ları da artık kullanılmamaktadır.

## 5. Phase 8 cleanup durumu

Tamamlanan:

- `web/src/core/matching.ts` kaldırıldı.
- Kullanılmayan `web/src/types/Matching.ts` kaldırıldı.
- Repository referansları kontrol edilerek aktif matching route'un `web/src/core/matching-engine.ts` kullandığı doğrulandı.
- Eski PR #79 kapatıldı.
- Release/migration prosedürü dokümante edildi.
- Authorization matrix dokümante edildi.
- Business status transitions dokümante edildi.

PR #90 — Phase 9 release-gate baseline — merged.
- Main reconciliation: `2da8953f...` gerçek main olarak doğrulandı.
- Stale branch temizliği ayrı bakım işidir; ürün geliştirmesini bloklamaz.

## 6. Production

Production servis:

`https://primeestate-v9eo.onrender.com`

Production runtime has been continuously verified through the current production smoke workflow. The Render health-check path is `/api/health`.

Doğrulananlar:
- Render deployment commit eşleşmesi
- authentication
- session
- customers
- sales
- payments
- one-time commission payment and ledger collection

Render UI bu ortamdan yönetilmez. Production durumu GitHub smoke veya kullanıcı tarafından sağlanan Render doğrulamasıyla kabul edilir.

## 7. CI

Main commit `18dee510bf310aa44a5283f4bbf84bbf19bec1de` için:
- PrimeEstate Web Quality #1306 ✅ (tests, lint, typecheck, production build)
- Production Auth Smoke #363 ✅ (Render deployment commit check, login/session, customer authorization)
- PR #154 checks: Web Quality #1305 ✅; Critical Tests #189 ✅
- PR #154 changed no schema; no production migration was required.

PR #82'nin public repository sonrasında yeniden çalıştırılan CI'sinde:
- Web Quality ✅
- Critical Tests ✅
- Foundation State Validation ✅

Private repository dönemindeki zero-step runner failure problemi artık görülmemektedir.

## 8. Release gate

Foundation release gate doğrulaması tamamlandı. Yeni ürün özelliği geliştirme artık Phase 12 kapsamında yürütülür.

Release Gate hedefi:
- Main CI green
- migration validation green
- auth smoke green
- authorization matrix green
- Critical E2E green
- runtime health green
- Dashboard/Finance production sayfaları 500 döndürmez
- `/api/health` database bağlantısı ile başarılıdır
- `/api/listings`, `/api/sales`, `/api/payments` production smoke kapsamında başarılıdır
- CURRENT_STATE gerçek main commit'i ile eşleşir

## 9. Kırmızı çizgiler

- Production DB reset edilmez.
- Secret/connection string source code'a yazılmaz.
- Yetkilendirme frontend'e bırakılmaz.
- CI kırmızıysa merge edilmez.
- Root cause görülmeden blind fix yapılmaz.
- Migration değişiklikleri plansız uygulanmaz.

## 10. Canonical handoff — current product work

- Active phase: **Phase 12 — Product Development / Core Workflow Experience**
- Active branch: `main`
- Current main commit at this reconciliation: `732b4f178af3c183ccb3c99e4b3c77b07bcf6acd` (always verify live at session start).
- PR #154: matching UI API error handling.
- PR #156: matching request race protection.
- PR #157: relationship contact outcomes connected to Prime learning and rematching.
- Post-merge Web Quality #1312 and Production Auth Smoke #365 were in progress when this file was updated; confirm before declaring green.
- Foundation release gate: closed.
- Immediate goal: continue Phase 12 core workflow and ensure outcome feedback reliably changes subsequent matching.

### Standard handoff

Future sessions begin with:

1. Read `PROJECT_STATE.md`.
2. Verify `main`, active branches, open PRs and CI.
3. Inspect the code named by the current task.
4. Continue from the first incomplete step.
5. Update `PROJECT_STATE.md` when the meaningful state changes.

**Current handoff: FOUNDATION CLOSED → PRODUCT DEVELOPMENT ACTIVE.**

_Last reconciled: 2026-10-11._
