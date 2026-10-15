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

Current verified runtime main: `c88a0665a99d51221518f302e4cea7e279e42528` (PR #174 merge; main Web Quality run [38742436619](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38742436619) and Production Auth HTTP Smoke run [38742436560](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38742436560) passed. Render deployed this exact commit; login/session, database health, customers, listings, sales, payments, dashboard and finance HTTP checks passed. Recheck latest main and CI at each session start).
- PR #154 merged: matching UI safely handles malformed/empty API responses.
- PR #156 merged: stale matching requests cannot overwrite newer selected-demand results.
- PR #157 merged: Relationship Workspace contact outcomes now use `/api/prime/action`, so Prime learning and active-demand rematching run through the existing authorized workflow.
- PR #157 pre-merge Web Quality #1311 and Critical Tests #192 passed; post-merge Web Quality #1312 and Production Auth HTTP Smoke #365 later passed.
- PR #158 state reconciliation checks passed and the documentation update was merged.
- PR #159 merged: Prime learning now removes a feature from the opposite sentiment list when a clear new outcome reverses it; mixed positive/negative outcomes are treated as neutral. Regression tests cover reversals and mixed feedback.
- PR #159 pre-merge Web Quality #1315 and Critical Tests #194 passed. Post-merge main Web Quality #1316 and Production Auth HTTP Smoke #366 both passed against `b1f69275e9e5cfaa51f2bf77477380434d822766`.

### Main / Release-gate baseline

Current main tip is `36daad13dda9c3cf16bcb4b1e6fc49e2db404f8f` (PR #171). The historical verified release-gate baseline is `2da8953f06304e6a2b6f049571a2df991b1e61e9`.

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

Latest verified main commit `c88a0665a99d51221518f302e4cea7e279e42528` için:
- PrimeEstate Web Quality run [38726333686](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38726333686) ✅
- Production Auth HTTP Smoke run [38726333696](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38726333696) ✅; Render commit `36daad13dda9c3cf16bcb4b1e6fc49e2db404f8f` ile eşleşti; login/session, database health, customers, listings, sales, payments, dashboard and finance kontrolleri başarılı.
- PR #171 Web Quality run [38725915536](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38725915536) ✅; Critical Tests run [38725915365](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38725915365) ✅
- PR #171 customer detail now returns active demands only, matching the “Aktif talepler” UI and matching API requirements. No schema or production migration change was required.

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
- Active branch: `main`; PR #166, #168, #169 and #171 are merged.
- Current main commit: `c88a0665a99d51221518f302e4cea7e279e42528`.
- PR #161: canonicalizes equivalent feature variants in Prime learning; merged.
- PR #162: prevents substring-only property feature matches; merged.
- PR #163: keeps null, undefined, and blank budget/area criteria unspecified; regression test added and merged.
- Main Web Quality [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38238109452), including migration parity, tests, lint, typecheck, production build, and the Phase 7 real-HTTP customer → demand → listing → matching → showing → offer chain.
- Main Foundation State Validation [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38238109533).
- Production Auth HTTP Smoke [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38238109479): Render commit matched `fa655986444378ba875ac5c8861bdaea51f89d98`; login/session, database health, customers, listings, sales, payments, dashboard and finance passed.
- Production smoke does not directly call `POST /api/matching`; that endpoint is covered by the CI real-HTTP E2E chain, not by a separate production matching smoke.
- Foundation release gate: closed.
- PR #165 merged: demand edit success returns to the edited customer detail.
- PR #166 merged: active demands on customer detail now have a visible **Düzenle** action alongside **Eşleştir**; existing authorization and API remain unchanged.
- PR #168 merged: demand-edit “Müşteri detayına dön” and “Vazgeç” navigate to the correct customer detail route rather than browser history.
- PR #169 merged: added resilient API response parsing for customer detail, offer/sale loading, showing-result updates, and demand edit/load/save; malformed or empty API bodies now produce a safe Turkish error instead of a raw JSON parse exception.
- PR #171 merged: customer detail now fetches only active demands; a real-HTTP regression test verifies inactive demands are not exposed as actionable “Aktif talepler”.
- PR #171 main Web Quality and Production Auth HTTP Smoke both passed; Render was confirmed on `36daad13dda9c3cf16bcb4b1e6fc49e2db404f8f`.
- Immediate goal: inspect the next concrete user-visible gap in the customer → demand → matching workflow and preserve all customer privacy / office portfolio boundaries.

### Standard handoff

Future sessions begin with:

1. Read `PROJECT_STATE.md`.
2. Verify `main`, active branches, open PRs and CI.
3. Inspect the code named by the current task.
4. Continue from the first incomplete step.
5. Update `PROJECT_STATE.md` when the meaningful state changes.

**Current handoff: FOUNDATION CLOSED → PRODUCT DEVELOPMENT ACTIVE.**

_Last reconciled: 2026-10-15 (after PR #171)._


## Latest verified update — PR #174 (2026-10-15)

- PR #174 merged: [Fix new demand navigation and API errors](https://github.com/kaankisa-primeestate/primeestate/pull/174).
- New-demand form back/cancel controls now navigate directly to the owning customer detail; new-demand API responses use shared safe parsing.
- No schema/migration or authorization changes.
- Current main commit: `c88a0665a99d51221518f302e4cea7e279e42528`.
- PR Web Quality [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38740404917), Critical Tests [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38740405598), main Web Quality [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38742436619), and Production Auth HTTP Smoke [passed](https://github.com/kaankisa-primeestate/primeestate/actions/runs/38742436560).
- Next: inspect the next concrete user-visible gap in customer → demand → matching. Do not claim the matching endpoint itself was separately production-smoke-tested.
