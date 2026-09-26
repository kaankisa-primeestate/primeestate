# PrimeEstate — CURRENT STATE

> **Canonical handoff:** `PROJECT_STATE.md`
>
> This file remains the compatibility/state-validation document. The canonical cross-session project memory is `PROJECT_STATE.md`. For a new development session, read `PROJECT_STATE.md` first, then verify GitHub `main`, open PRs, CI and relevant code.

## 1. Proje

PrimeEstate, gayrimenkule özel, AI destekli, uçtan uca entegre bir Office Operating System / SaaS platformudur.

**Ana prensip:** TEK VERİ, ÇOK FONKSİYON

- Ana geliştirme repo: `kaankisa-primeestate/primeestate`
- Canlı/referans repo: `kaankisa-primeestate/remax-CRM`
- `remax-CRM` değiştirilmez.
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

**Phase 9 — Release Gate / next feature-development baseline**

## 4. Doğrulanmış GitHub durumu

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

22.09.2026 tarihinde main commit `2aca0b1...` için Production Auth Smoke başarılıdır.

Doğrulananlar:
- Render deployment commit eşleşmesi
- authentication
- session
- customers
- sales
- payments
- payment plans

Render UI bu ortamdan yönetilmez. Production durumu GitHub smoke veya kullanıcı tarafından sağlanan Render doğrulamasıyla kabul edilir.

## 7. CI

Main commit `2aca0b1...` için:
- PrimeEstate Web Quality ✅
- Production Auth Smoke ✅
- Production Prisma Migration Status ✅ (`Database schema is up to date!`)

PR #82'nin public repository sonrasında yeniden çalıştırılan CI'sinde:
- Web Quality ✅
- Critical Tests ✅
- Foundation State Validation ✅

Private repository dönemindeki zero-step runner failure problemi artık görülmemektedir.

## 8. Release gate

Foundation release gate doğrulaması tamamlanmış olduğundan yeni ürün özelliği geliştirme Phase 9 kapsamında başlatılabilir.

Release Gate hedefi:
- Main CI green
- migration validation green
- auth smoke green
- authorization matrix green
- Critical E2E green
- runtime health green
- Dashboard/Finance production sayfaları 500 döndürmez
- `/api/health` database bağlantısı ile başarılıdır
- `/api/listings`, `/api/sales`, `/api/payments`, `/api/payment-plans` production smoke kapsamında başarılıdır
- CURRENT_STATE gerçek main commit'i ile eşleşir

## 9. Kırmızı çizgiler

- `remax-CRM` değiştirilmez.
- Production DB reset edilmez.
- Secret/connection string source code'a yazılmaz.
- Yetkilendirme frontend'e bırakılmaz.
- CI kırmızıysa merge edilmez.
- Root cause görülmeden blind fix yapılmaz.
- Migration değişiklikleri plansız uygulanmaz.

## 10. Canonical handoff — current product work

- Active phase: **Prime Brain — Outcome Learning**
- Active branch: `feat/prime-outcome-learning`
- Base main commit: `373b39b0e676ce2eafc4d02f513fb03781814c10`
- Active PR: **not created yet**
- Immediate goal: outcome → Prime memory → rematch → changed recommendation

### Standard handoff

Future sessions begin with:

1. Read `PROJECT_STATE.md`.
2. Verify `main`, active branches, open PRs and CI.
3. Inspect the code named by the current task.
4. Continue from the first incomplete step.
5. Update `PROJECT_STATE.md` when the meaningful state changes.

_Last reconciled as part of the canonical project-memory setup._
