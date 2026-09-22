# PrimeEstate — CURRENT STATE

> Oturumlar arası devralma kaydıdır. Her yeni oturumda bu dosya GitHub'daki gerçek main/branch/PR/CI durumu ile karşılaştırılır.

## 1. Proje
PrimeEstate, gayrimenkule özel, AI destekli, uçtan uca entegre bir Office Operating System / SaaS platformudur.

**Ana prensip:** TEK VERİ, ÇOK FONKSİYON

- Ana geliştirme repo: `kaankisa-primeestate/primeestate`
- Canlı/referans repo: `kaankisa-primeestate/remax-CRM`
- `remax-CRM` canlı sistemdir; değiştirilmez.
- PrimeEstate ana geliştirme tabanıdır.

## 2. Mimari
- Next.js + React + TypeScript
- Prisma + PostgreSQL/Neon
- Better Auth
- Multi-tenant
- Responsive / mobile-first
- API seviyesinde tenant + role scope
- AI provider bağımsız mimari

## 3. Foundation Recovery durumu

Yeni özellik geliştirme **geçici olarak donduruldu**.

### Tamamlanan
- Phase 0 — Inventory & freeze
- Phase 1 — Database / migration integrity
- Phase 2 — Data model integrity
- Phase 3 — Authorization foundation
- Phase 4 — API response helper foundation + kritik auth/validation/not-found error normalization
- Phase 5 — Runtime & Route Protection:
  - merkezi sayfa authentication guard
  - role-aware /users koruması
  - Better Auth session kontrolü
  - unauthenticated → /login
  - authenticated-but-unauthorized → /forbidden
  - route matcher / production build doğrulaması
- Phase 6 — ilk test foundation slice:
  - `npm test`
  - Node built-in test runner
  - authorization role matrix
  - customer ownership/team scope
  - office listing scope
  - read-only write denial
  - route access matrix
  - Web Quality CI test adımı
- Phase 6 — database-backed integration slice:
  - agent customer ownership isolation
  - cross-office / cross-organization isolation
  - shared office listing visibility
  - accepted Offer ↔ Sale linkage
  - Sale ↔ Listing uniqueness invariant
  - CI test database migration deployment before integration tests
- Phase 6 — actual API route integration slice:
  - protected customer route unauthenticated → 401
  - agent customer owner isolation through the real HTTP route
  - Team Leader team-scoped customer visibility through the real HTTP route
  - OFFICE_ADMIN / ORG_ADMIN customer visibility through the real HTTP route
  - agent cross-owner assignment denied through the real HTTP route
  - VIEWER write denial across customer/sales/payments/payment-plan routes
  - Better Auth session login exercised against the running Next.js app
- Phase 6 — financial invariant integration slice:
  - Payment ↔ Ledger office/consultant split consistency
  - PaymentPlan ↔ Installment currency/total/sequence consistency
  - duplicate PaymentPlan per Sale denied by database uniqueness
  - duplicate installment sequence per plan denied by database uniqueness
- CI — docs-only main merges no longer trigger production deployment smoke

### Bilinçli olarak ertelenen
Phase 4'ün kalan conflict/database error normalization ve geniş API contract test kapsamı şimdilik uygulanmayacak.

Phase 7'nin kritik HTTP business chain'i ve Dashboard/Finance canlı veri doğrulaması tamamlanmıştır. Dashboard finans özeti aggregate sorgularla beslenir ve başarısız finans yenilemesinde son başarılı finans verisi korunur.

### Aktif phase
**Phase 8 — Codebase cleanup & documentation**


## 4. Doğrulanmış main
Son doğrulanmış main commit:
`3846fe23ca59f8e0d5853931f74946184f72bc1f`

PR #80 — Phase 7 Critical E2E business chain — merged.

PR #80 sonrası:
- customer → demand → listing → matching → showing → offer → accepted offer → sale → commission → payment → payment plan/installments
- CI test zinciri main'e alınmıştır.

Ayrıca Codex devralma dosyaları main'e eklenmiştir:
- `AGENTS.md`
- `CODEX_PROJECT_HANDOFF.md`

### Açık iş
Phase 8 codebase cleanup & documentation.
PR #81 stale durumda kapatılmış ve merge edilmemiştir. PR #82 current-main tabanında doğrulanmış ve merge edilmiştir. PR #83 dokümantasyon reconcile işlemini tamamlamıştır.

## 5. Runtime / production notu
Production Auth Smoke workflow deployment commit doğrulamasını koruyor. Render UI bu ortamdan doğrudan yönetilemiyor; production deploy durumu yalnızca GitHub smoke çıktısı veya kullanıcı tarafından sağlanan Render doğrulamasıyla kabul edilir.

## 6. Foundation çalışma sırası
1. Phase 0 — tamamlandı
2. Phase 1 — tamamlandı
3. Phase 2 — tamamlandı
4. Phase 3 — tamamlandı
5. Phase 4 — kritik temel tamamlandı; kalan contract hardening ertelendi
6. Phase 5 — tamamlandı
7. Phase 6 — integration / authorization / business invariant testleri tamamlandı
8. Phase 7 — Critical E2E business chain tamamlandı ve PR #80 main'e merge edildi
9. Phase 7 — Dashboard ve Finance canlı veri doğrulaması — tamamlandı
10. Phase 8 — Codebase cleanup & documentation
11. Phase 9 — Release gate

> Yeni ürün özelliği geliştirmeye release gate tamamlanmadan başlanmaz.

## 7. Kırmızı çizgiler
- Canlı `remax-CRM` değiştirilmez.
- Secret/connection string kullanıcıdan istenmez.
- Production database reset yapılmaz.
- Tahmin edilen durum gerçek durum gibi sunulmaz.
- Seed veri gerçek veri gibi bırakılmaz.
- Yetkilendirme frontend'e bırakılmaz.
- Modüller bağımsız ada şeklinde tasarlanmaz.
- Çalışan özellikler gereksiz yere kırılmaz.
- CI yeşil olmadan merge edilmez.
- Migration uygulanmadan önce migration planı ve geri dönüş etkisi incelenir.

## 8. Çalışma disiplini
1. main/branch/PR/CI doğrulanır.
2. O anki hedef phase seçilir.
3. Ayrı branch açılır.
4. Kodlanır.
5. Otomatik doğrulamalar çalıştırılır.
6. PR açılır.
7. CI yeşil olmadan merge edilmez.
8. Merge sonrası main tekrar doğrulanır.
9. CURRENT_STATE.md ve FOUNDATION_RECOVERY_PLAN.md güncellenir.
10. Sonraki hedefe geçilir.

## 9. Yeni oturum başlangıç komutu
```
PrimeEstate'i devral. Önce AGENTS.md, CODEX_PROJECT_HANDOFF.md, CURRENT_STATE.md ve FOUNDATION_RECOVERY_PLAN.md dosyalarını oku. Sonra GitHub main, açık PR'lar ve CI durumunu doğrula. PR #81'in eski branch geçmişini körlemesine kullanma; current main tabanından devam et. remax-CRM reposuna dokunma. Önce Dashboard/Finance live verification ve CI root-cause doğrulamasını tamamla, sonra Phase 8/9'a geç.
```
