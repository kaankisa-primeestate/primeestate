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
  - agent cross-owner assignment denied through the real HTTP route
  - VIEWER write denial across customer/sales/payments/payment-plan routes
  - Better Auth session login exercised against the running Next.js app
- CI — docs-only main merges no longer trigger production deployment smoke

### Bilinçli olarak ertelenen
Phase 4'ün kalan conflict/database error normalization ve geniş API contract test kapsamı şimdilik uygulanmayacak.

Phase 6'nın geniş business invariant kapsamı, Office/Admin scope integration ve critical-test required-check kapsamı aktif sonraki çalışma alanıdır.

### Aktif phase
**Phase 6 — Integration / Tenant Isolation / Business Invariant Tests**

## 4. Doğrulanmış main
Son doğrulanmış main commit:
`0c64b2f204ea73d8d0cae7c144b1920b1af8b4f3`

- PR #68 — Foundation Phase 5: protect page routes and admin access — merged.
- PR #69 — Foundation: sync state after Phase 5 route protection — merged.
- PR #70 — CI: prevent production smoke on docs-only main merges — merged.
- PR #71 — Phase 6: add tenant isolation and business invariant integration tests — merged.
- PR #73 — Phase 6: integrate protected API route tests — merged.

PR #71 CI doğrulaması:
- Web Quality: success
- Migration parity: success
- Phase 6 integration tests: success
- Lint: success
- Typecheck: success
- Production build: success

PR #73 CI doğrulaması:
- Web Quality: success
- Migration parity: success
- Phase 6 API integration tests: success
- Lint: success
- Typecheck: success
- Production build: success

PR #69'da görülen production smoke timeout'u gerçek bir CI tetikleme problemiydi: docs-only merge Render deployment üretmediği halde smoke testi deployment commiti bekledi. PR #70 ile smoke workflow yalnızca deploy edilebilir `web/**` değişikliklerinde otomatik çalışacak şekilde düzeltildi; manuel `workflow_dispatch` korunuyor.

Render canlı sürümünün son kullanıcı tarafından doğrulanan commiti `51001ae` idi. Docs/CI-only merge'ler Render'a gereksiz deployment yaptırmıyor.

## 5. Runtime / production notu
Production Auth Smoke workflow deployment commit doğrulamasını koruyor. Render UI bu ortamdan doğrudan yönetilemiyor; production deploy durumu yalnızca GitHub smoke çıktısı veya kullanıcı tarafından sağlanan Render doğrulamasıyla kabul edilir.

## 6. Foundation çalışma sırası
1. Phase 0 — tamamlandı
2. Phase 1 — tamamlandı
3. Phase 2 — tamamlandı
4. Phase 3 — tamamlandı
5. Phase 4 — kritik temel tamamlandı; kalan contract hardening ertelendi
6. Phase 5 — tamamlandı
7. Phase 6 — initial unit/test foundation tamamlandı
8. Phase 6 — database-backed tenant/invariant integration slice tamamlandı
9. Phase 6 — actual API route integration + initial authorization matrix integration tamamlandı
10. **Phase 6 — geniş business invariant + Office/Admin scope + required-check kapsamı aktif**
11. Phase 7 — Critical E2E business chain
12. Phase 8 — Codebase cleanup & documentation
13. Phase 9 — Release gate

> Phase 4'ün kalan kısmı kullanıcı kararıyla şimdilik atlandı. Yeni ürün özelliği geliştirmeye geçmeden önce Phase 6'nın kritik entegrasyon/test kapsamı tamamlanacaktır.

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
PrimeEstate'i devral. Önce CURRENT_STATE.md ve FOUNDATION_RECOVERY_PLAN.md dosyalarını, GitHub'daki güncel main/branch/PR/CI durumunu kontrol et. Phase 6 kritik API integration / authorization matrix / business invariant testlerinden devam et. Canlı remax-CRM reposuna dokunma.
```
