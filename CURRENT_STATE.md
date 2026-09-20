# PrimeEstate — CURRENT STATE

> Bu dosya projenin oturumlar arası devralma kaydıdır. Yeni bir oturum başlamadan önce GitHub'daki güncel branch/PR/CI durumu ile birlikte kontrol edilmelidir.

## 1. Proje
PrimeEstate, gayrimenkule özel, AI destekli, uçtan uca entegre bir Office Operating System / SaaS platformudur.

Ana prensip: **TEK VERİ, ÇOK FONKSİYON**

- Ana geliştirme repo: `kaankisa-primeestate/primeestate`
- Canlı/referans repo: `kaankisa-primeestate/remax-CRM`
- `remax-CRM` canlı sistemdir; değiştirilmez.
- PrimeEstate ana geliştirme tabanıdır.

## 2. Mimari temel
- Next.js + React + TypeScript
- Prisma + PostgreSQL/Neon
- Better Auth
- Multi-tenant
- Responsive / mobile-first
- API seviyesinde tenant + role scope
- AI provider bağımsız mimari hedefi

## 3. Yetki modeli
- Agent: kendi müşterileri
- Team Leader: kendi ekibinin müşterileri
- Office/Admin: ofis kapsamındaki müşteri verileri
- Ofis portföy havuzu: danışmanlar arasında ortak
- Frontend gizleme tek başına yetki kontrolü değildir; API/backend scope zorunludur.
- AI kullanıcı yetkilerini aşamaz.

## 4. Tamamlanan işler

### Foundation
- PostgreSQL / Prisma altyapısı
- Better Auth
- tenant context
- kullanıcı rolleri
- admin bootstrap
- kontrollü password reset
- production build hardening
- CI kalite workflow'u

### Customer API V1 — PR #6
Merge edildi.
- GET /api/customers
- POST /api/customers
- GET /api/customers/[id]
- tenant scope
- agent/team leader/manager yetki kapsamları
- audit log

### Clients / CRM — PR #7
Merge edildi.
- gerçek DB müşterileri
- arama ve rol filtreleri
- loading/error durumları
- yeni müşteri oluşturma
- seed veri kaldırıldı

### Customer Demand V1 — PR #8
Merge edildi.
- POST /api/customers/[id]/demands
- müşteri-talep ilişkisi
- talep tipi / gayrimenkul tipi
- lokasyon
- bütçe
- m²
- oda
- öncelik
- notlar
- audit log

## 5. Son aktif iş — Portfolio Real Data V1

Branch:
`crm/portfolio-real-data-v1`

PR:
#9 — CRM V1: connect portfolio screen to real listings

Son bilinen commit:
`4c2f5e1776c9c007b81128640195283c310789f3`

Bu işte:
- `GET /api/listings` oluşturuldu.
- Portföy ekranı seed veriden çıkarıldı.
- Gerçek Property + Listing verisine bağlandı.
- arama
- Satılık/Kiralık filtreleri
- gayrimenkul tipi filtreleri
- loading/error/empty states
- danışman bilgileri
- match/showing/offer sayıları
- ofis ortak portföy havuzu

**Güncel doğrulama:** PR #9, 20.09.2026 tarihinde CI başarılı olduktan sonra merge edildi. Merge commit: `3b486045e96dd16472d24e5a65f8ba306f0683ed`.

## 6. Şu anki aktif iş — Matching Engine V1

Branch:
`crm/matching-engine-v1`

PR:
#10 — CRM V1: deterministic matching engine

Durum: **Açık / Draft / CI çalışıyor**

İlk dikey dilim gerçek tenant-scoped Customer + Demand + Listing verisini kullanacak şekilde geliştirildi.

Tamamlanan bu dilimde:
- deterministic 0–100 skor
- kategori %20
- lokasyon %25
- bütçe %20
- m² %10
- temel özellikler %15
- tercihler %5
- uygunluk %5
- `mustNotHave` için güçlü negatif ceza
- eşleşme nedenleri ve karşılanmayan kriterler
- `Match` kayıtlarının persist edilmesi
- matching workspace'in mock veriden gerçek API'ye bağlanması

CI yeşil olmadan PR #10 merge edilmeyecek.

## 7. Sonraki iş
Matching Engine V1 tamamlandıktan sonra:

**Sales Operations — gerçek veri bağlantısı**

İlk versiyon deterministic/rule-based olacaktır.

Önerilen ağırlıklar:
- Kategori %20
- Lokasyon %25
- Bütçe %20
- m² %10
- Temel özellikler %15
- Tercihler %5
- Zaman/aciliyet %5

Çıktı:
- 0–100 skor
- eşleşen kriterler
- karşılanmayan kriterler
- eşleşme nedenleri
- must-not-have için güçlü negatif etki

İlk hedef:
**TALEP → UYGUN PORTFÖYLER**

AI ilk aşamada skorlamayı yapmayacak. Deterministik motor kurulduktan sonra AI açıklama/özet/öneri katmanı olarak eklenecek.

## 8. Çalışma disiplini
Her geliştirme:
1. Mevcut main/branch/PR/CI durumu doğrulanır.
2. Tek bir küçük dikey dilim seçilir.
3. Ayrı branch açılır.
4. Kodlanır.
5. lint + typecheck + build çalıştırılır.
6. CI sonucu kontrol edilir.
7. PR oluşturulur.
8. CI yeşil olmadan merge edilmez.
9. Merge sonrası main doğrulanır.
10. Bu dosya güncellenir.

## 9. Kırmızı çizgiler
- Canlı `remax-CRM` değiştirilmez.
- Secret/connection string kullanıcıdan istenmez.
- Tahmin edilen durum gerçek durum gibi sunulmaz.
- Seed veri gerçek veri gibi bırakılmaz.
- Yetkilendirme frontend'e bırakılmaz.
- Modüller bağımsız ada şeklinde tasarlanmaz.
- Çalışan özellikler gereksiz yere kırılmaz.
- AI kritik alanları izinsiz değiştiremez.

## 10. Yeni oturum başlangıç komutu

```
PrimeEstate'i devral. Önce CURRENT_STATE.md dosyasını ve GitHub'daki güncel main, branch, PR ve CI durumunu kontrol et. Bu kayıttaki bilgileri tahmin olarak değil, GitHub'dan doğrulanmış gerçek durumla karşılaştır. Fark varsa belirt. Son tamamlanmamış işten devam et. Canlı remax-CRM reposuna dokunma. Tek bir doğrulanabilir dikey dilim üzerinde çalış; CI yeşil olmadan merge etme. Oturum sonunda CURRENT_STATE.md dosyasını güncelle.
```
