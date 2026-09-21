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
- Phase 6 — ilk test altyapısı dilimi:
  - `npm test`
  - Node built-in test runner
  - authorization role matrix
  - customer ownership/team scope
  - office listing scope
  - read-only write denial
  - route access matrix
  - Web Quality CI test adımı

### Bilinçli olarak ertelenen
Phase 4'ün kalan conflict/database error normalization ve geniş API contract test kapsamı şimdilik uygulanmayacak.

Phase 6'nın kalan integration, tenant isolation ve business invariant testleri aktif sonraki çalışma alanıdır.

### Aktif phase
**Phase 6 — Integration / Tenant Isolation / Business Invariant Tests**

## 4. Doğrulanmış main
Son doğrulanmış main commit:
`51001ae67e7ae355f522b972a2136906a46eb9ae`

PR #68 — Foundation Phase 5: protect page routes and admin access — merged.

Main doğrulaması:
- Web Quality #456: success
- Production Auth Smoke #48: success
- Web Quality içinde migration parity, tests, lint, typecheck ve production build: success

PR #68 branch'inde önceki kırmızı workflow denemeleri düzeltme sürecine aittir; final yeşil run merge edilmiştir. Tarihsel failed run kayıtları silinmeyecek ve mevcut main için engel kabul edilmeyecektir.

## 5. Runtime / production notu
Production Auth Smoke workflow deployment commit doğrulamasını koruyor. Render UI bu ortamdan doğrudan yönetilemiyor; production deploy durumu yalnızca GitHub smoke çıktısı veya kullanıcı tarafından sağlanan Render doğrulamasıyla kabul edilir.

## 6. Foundation çalışma sırası
1. Phase 0 — tamamlandı
2. Phase 1 — tamamlandı
3. Phase 2 — tamamlandı
4. Phase 3 — tamamlandı
5. Phase 4 — kritik temel tamamlandı; kalan contract hardening ertelendi
6. Phase 6 — ilk test foundation slice tamamlandı
7. Phase 5 — tamamlandı
8. **Phase 6 — kalan integration / isolation / invariant testleri aktif**
9. Phase 7 — Critical E2E business chain
10. Phase 8 — Codebase cleanup & documentation
11. Phase 9 — Release gate

> Kullanıcı kararıyla Phase 4'ün kalan kısmı şimdilik atlandı; Phase 5 route protection tamamlandı ve şimdi Phase 6'nın kalan test kapsamına geçiliyor.

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
PrimeEstate'i devral. Önce CURRENT_STATE.md ve FOUNDATION_RECOVERY_PLAN.md dosyalarını, GitHub'daki güncel main/branch/PR/CI durumunu kontrol et. Phase 6 integration/isolation/invariant testlerinden devam et. Canlı remax-CRM reposuna dokunma.
```
