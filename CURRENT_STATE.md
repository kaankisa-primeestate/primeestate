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

## 3. Foundation Recovery durumu — 21.09.2026

Yeni özellik geliştirme **geçici olarak donduruldu**. Önce teknik temel P0-P9 aşamalarında sertleştirilecek.

Master checklist:
`FOUNDATION_RECOVERY_PLAN.md`

Audit sonucu öne çıkan kritik riskler:
- Production DB migration state ile uygulama/schema parity'si ayrıca doğrulanmalı.
- `/api/sales` production'da 500 veriyor; dashboard V10 artık gerçek endpoint/status bilgisini gösteriyor.
- API response/error standardı merkezi değil.
- Authorization policy endpoint'lere dağılmış durumda; VIEWER/AUDITOR davranışları ayrıca sertleştirilmeli.
- UI route seviyesinde merkezi auth guard bulunmuyor.
- Otomatik test/E2E kapsamı kritik iş akışının gerisinde.
- İki matching engine bulunuyor; tek business engine'e indirilecek.
- Finansal state transition ve ledger bütünlüğü sertleştirilecek.
- Dokümantasyon kodla yeniden senkronize edilecek.

## 4. Doğrulanmış main
Son doğrulanmış main commit:
`bbde12a3891a509a8aea15446b0f2410158915a7`

PR #48 Phase 1 database/migration integrity merge edildi: `927d6d12508979d22aebc6395678dcf578074fb5`.
PR #49 production runtime smoke genişletmesi merge edildi: `bbde12a3891a509a8aea15446b0f2410158915a7`.
Production migration #2 başarıyla çalıştı ve production smoke #31 başarıyla geçti; `/api/sales`, `/api/payments` ve `/api/payment-plans` authenticated smoke kapsamında doğrulandı.

**Aktif phase: Phase 2 — Data model integrity.**


PR #46 — **Fix dashboard API response handling**
- CI #269: **success**
- PR #46: **merged**
- Merge commit: `399a6cd2fc08cde4b28a79d304e61f611fa393a0`

PR #47 ile foundation recovery baseline merge edildi.\n\nPR #46 ile Dashboard:
- boş/non-JSON response'larda güvenli parse yapıyor,
- tek endpoint arızasının tüm dashboard'u düşürmesini engelliyor,
- problemli endpoint/status bilgisini gösteriyor.

## 5. Mevcut runtime bulgusu
Önceki `/api/sales` HTTP 500 problemi production migration parity eksikliğinden kaynaklanıyordu ve Phase 1 kapsamında giderildi.
Production smoke #31 başarıyla geçti. Dashboard/Finance UI görsel doğrulaması ayrıca yapılabilir; API runtime tarafında kritik finans endpointleri smoke testten geçti.

## 6. Foundation çalışma sırası

1. Phase 0 — Inventory & freeze
2. Phase 1 — Database / migration integrity — tamamlandı
3. Phase 2 — Data model integrity — aktif
4. Phase 3 — Authorization foundation
5. Phase 4 — API contract & error handling
6. Phase 5 — Runtime & route protection
7. Phase 6 — Test foundation
8. Phase 7 — Critical E2E business chain
9. Phase 8 — Codebase cleanup & documentation
10. Phase 9 — Release gate

**Kural:** Bir phase doğrulanmadan sonraki phase'e geçilmeyecek. Phase 1 aktif; production DB migration state henüz doğrulanmadı.

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
2. O anki phase'in tek hedefi seçilir.
3. Ayrı branch açılır.
4. Kodlanır.
5. Otomatik doğrulamalar çalıştırılır.
6. PR açılır.
7. CI yeşil olmadan merge edilmez.
8. Merge sonrası main tekrar doğrulanır.
9. Bu dosya ve `FOUNDATION_RECOVERY_PLAN.md` güncellenir.
10. Sonraki phase'e geçilir.

## 9. Yeni oturum başlangıç komutu
```
PrimeEstate'i devral. Önce CURRENT_STATE.md ve FOUNDATION_RECOVERY_PLAN.md dosyalarını, GitHub'daki güncel main/branch/PR/CI durumunu kontrol et. Hangi foundation phase'inde olduğumuzu doğrula. Tamamlanan aşamaları tekrar yapma; bir sonraki tamamlanmamış aşamadan devam et. Canlı remax-CRM reposuna dokunma. Her aşamada implementation -> automated validation -> PR -> green CI -> merge -> main verification -> state update zincirini uygula.
```
