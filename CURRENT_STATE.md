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
- Phase 6 — ilk test altyapısı dilimi:
  - `npm test`
  - Node built-in test runner
  - authorization role matrix
  - customer ownership/team scope
  - office listing scope
  - read-only write denial
  - Web Quality CI test adımı

### Bilinçli olarak ertelenen
Phase 4'ün kalan conflict/database error normalization ve geniş API contract test kapsamı şimdilik uygulanmayacak.

Phase 6'nın kalan integration, tenant isolation ve business invariant testleri Phase 5 sonrasına bırakıldı.

### Aktif phase
**Phase 5 — Runtime & Route Protection**

## 4. Doğrulanmış main
Son doğrulanmış main commit:
`01cf5c99e8308c134875e1aeb6c707f6824813dc`

PR #66 — Foundation Phase 6: establish test foundation — merged.

PR #66 Web Quality #444:
- Tests: success
- Lint: success
- Typecheck: success
- Production build: success

PR #64 sonrası main:
- Web Quality #435: success
- Production Auth Smoke #45: success

## 5. Runtime / production notu
Production Auth Smoke workflow deployment commit doğrulamasını koruyor. Render UI bu ortamdan doğrudan yönetilemiyor; production deploy durumu yalnızca GitHub smoke çıktısı veya kullanıcı tarafından sağlanan Render doğrulamasıyla kabul edilir.

## 6. Foundation çalışma sırası
1. Phase 0 — tamamlandı
2. Phase 1 — tamamlandı
3. Phase 2 — tamamlandı
4. Phase 3 — tamamlandı
5. Phase 4 — kritik temel tamamlandı; kalan contract hardening ertelendi
6. Phase 6 — ilk test foundation slice tamamlandı
7. **Phase 5 — aktif**
8. Phase 6 — kalan test kapsamı
9. Phase 7 — Critical E2E business chain
10. Phase 8 — Codebase cleanup & documentation
11. Phase 9 — Release gate

> Kullanıcı kararıyla Phase 4'ün kalan kısmı şimdilik atlandı; test altyapısının ilk dilimi kuruldu ve şimdi Phase 5'e geçiliyor.

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
PrimeEstate'i devral. Önce CURRENT_STATE.md ve FOUNDATION_RECOVERY_PLAN.md dosyalarını, GitHub'daki güncel main/branch/PR/CI durumunu kontrol et. Phase 5 runtime & route protection'dan devam et. Canlı remax-CRM reposuna dokunma.
```
